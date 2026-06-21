import { GoogleGenAI, Type } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });


interface Finding {
  title: string;
  description: string;
  filePath: string;
}

export async function getCodeFix(finding: Finding, context: string): Promise<{ explanation: string; fixedCode: string }> {
  const prompt = `
You are a senior security engineer.

Finding:
${finding.title}

Description:
${finding.description}

File:
${finding.filePath}

Code:
${context}
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
          fixedCode: {
            type: Type.STRING,
            description: "The complete, corrected source code."
          }
        },
        required: ["explanation", "fixedCode"]
      }
    }
  });

  const text = response.text;
  if (!text) {
    throw new Error("No response text from Gemini");
  }

  const parsed = JSON.parse(text);
  return {
    explanation: parsed.explanation ?? "",
    fixedCode: parsed.fixedCode ?? ""
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

Please fix all of the findings in the file. Ensure the code remains syntactically correct and preserves its original logic while resolving all the listed vulnerabilities.

Return ONLY JSON:
{
  "explanation": "Brief explanation of all the fixes made.",
  "fixedCode": "The complete, corrected content of the file."
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
          fixedCode: {
            type: Type.STRING,
            description: "The complete new source code for the file, with all fixes applied."
          }
        },
        required: ["explanation", "fixedCode"]
      }
    }
  });

  const text = response.text;
  if (!text) {
    throw new Error("No response text from Gemini");
  }

  const parsed = JSON.parse(text);
  return {
    explanation: parsed.explanation ?? "",
    fixedCode: parsed.fixedCode ?? ""
  };
}

