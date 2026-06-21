import { GoogleGenAI, Type } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });


interface Finding {
  title: string;
  description: string;
  filePath: string;
}

export async function getCodeFix(finding: Finding, fileContent: string, context: string): Promise<{ explanation: string; fixedCode: string }> {
  const prompt = `
You are a senior security engineer.

Finding:
${finding.title}

Description:
${finding.description}

File:
${finding.filePath}

Here is the code context around the vulnerability (approx 30 lines):
\`\`\`
${context}
\`\`\`

Please identify the specific vulnerable section within the code context above and generate a secure replacement.

Return ONLY JSON matching this schema:
{
  "explanation": "Explanation of the finding and how to fix it.",
  "targetContent": "The EXACT lines of code from the context that need to be replaced. Must match character-for-character including exact indentation.",
  "replacementContent": "The corrected version of targetContent."
}
`;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          explanation: {
            type: Type.STRING,
            description: "Explanation of the finding and how to fix it."
          },
          targetContent: {
            type: Type.STRING,
            description: "The EXACT lines of code from the context that need to be replaced. Must match character-for-character including exact indentation."
          },
          replacementContent: {
            type: Type.STRING,
            description: "The corrected version of targetContent."
          }
        },
        required: ["explanation", "targetContent", "replacementContent"]
      }
    }
  });

  const text = response.text;
  if (!text) {
    throw new Error("No response text from Gemini");
  }

  const parsed = JSON.parse(text);
  const target = parsed.targetContent ?? "";
  const replacement = parsed.replacementContent ?? "";

  let updatedCode = fileContent.replace(/\r\n/g, "\n");
  const normalizedTarget = (target ?? "").replace(/\r\n/g, "\n");
  const normalizedReplacement = (replacement ?? "").replace(/\r\n/g, "\n");
  const normalizedContext = (context ?? "").replace(/\r\n/g, "\n");

  if (normalizedTarget && updatedCode.includes(normalizedTarget)) {
    updatedCode = updatedCode.replace(normalizedTarget, normalizedReplacement);
  } else if (normalizedTarget) {
    // Fallback: if exact match fails, try replacing in context
    console.warn("Exact target match failed, attempting context fallback.");
    if (normalizedContext.includes(normalizedTarget)) {
      const updatedContext = normalizedContext.replace(normalizedTarget, normalizedReplacement);
      updatedCode = updatedCode.replace(normalizedContext, updatedContext);
    }
  }

  return {
    explanation: parsed.explanation ?? "",
    fixedCode: updatedCode
  };
}

interface FileFinding {
  title: string;
  description: string;
  line: number;
}

export async function getMultipleCodeFixes(
  filePath: string,
  fileContent: string,
  findings: FileFinding[]
): Promise<{ explanation: string; fixedCode: string }> {
  const findingsText = findings.map((f, i) => `
Finding #${i + 1}:
Title: ${f.title}
Line: ${f.line}
Description: ${f.description}
`).join('\n---\n');

  const prompt = `
You are a senior security engineer.

We have a source file: ${filePath}

Current File Content:
\`\`\`
${fileContent}
\`\`\`

Here are the security findings in this file that need to be fixed:
${findingsText}

Please generate specific code edits to resolve all the listed vulnerabilities. For each fix, identify the exact target block of code to replace and provide the replacement code.

Return ONLY JSON matching this schema:
{
  "explanation": "Brief explanation of all the fixes made.",
  "edits": [
    {
      "targetContent": "The EXACT lines of code from the file that need to be replaced. Must match character-for-character including exact indentation.",
      "replacementContent": "The corrected version of targetContent."
    }
  ]
}
`;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          explanation: {
            type: Type.STRING,
            description: "Detailed explanation of all the fixes applied to the file."
          },
          edits: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                targetContent: {
                  type: Type.STRING,
                  description: "The EXACT lines of code from the file that need to be replaced. Must match character-for-character including exact indentation."
                },
                replacementContent: {
                  type: Type.STRING,
                  description: "The corrected version of targetContent."
                }
              },
              required: ["targetContent", "replacementContent"]
            },
            description: "List of individual edits to apply to the file."
          }
        },
        required: ["explanation", "edits"]
      }
    }
  });

  const text = response.text;
  if (!text) {
    throw new Error("No response text from Gemini");
  }

  const parsed = JSON.parse(text);
  let updatedCode = fileContent.replace(/\r\n/g, "\n");
  if (parsed.edits && Array.isArray(parsed.edits)) {
    for (const edit of parsed.edits) {
      const target = edit.targetContent;
      const replacement = edit.replacementContent;
      const normalizedTarget = (target ?? "").replace(/\r\n/g, "\n");
      const normalizedReplacement = (replacement ?? "").replace(/\r\n/g, "\n");

      if (normalizedTarget && updatedCode.includes(normalizedTarget)) {
        updatedCode = updatedCode.replace(normalizedTarget, normalizedReplacement);
      } else if (normalizedTarget) {
        console.warn(`Could not find target content for edit: ${target}`);
      }
    }
  }

  return {
    explanation: parsed.explanation ?? "",
    fixedCode: updatedCode
  };
}

