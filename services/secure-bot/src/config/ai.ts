import OpenAI from 'openai';

const client = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY!
});

function cleanJsonResponse(text: string): string {
  let cleaned = text.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```[a-zA-Z]*\s*/, "");
    cleaned = cleaned.replace(/\s*```$/, "");
  }
  return cleaned.trim();
}

async function callOpenRouterWithFallback(messages: { role: 'system' | 'user' | 'assistant'; content: string }[]): Promise<string> {
  const models = [
    'google/gemma-4-31b-it:free',
    'qwen/qwen3-coder:free',
    'meta-llama/llama-3.3-70b-instruct:free',
    'openrouter/free'
  ];

  let lastError: any = null;
  for (const model of models) {
    try {
      console.log(`[OpenRouter] Attempting completion with model: ${model}`);
      const response = await client.chat.completions.create({
        model,
        messages,
      });
      const text = response.choices[0]?.message?.content;
      if (text) {
        console.log(`[OpenRouter] Successfully got response from model: ${model}`);
        return text;
      }
    } catch (error: any) {
      console.warn(`[OpenRouter] Model ${model} failed or rate-limited:`, error.message || error);
      lastError = error;
    }
  }

  throw lastError || new Error("All fallback models failed to return a response.");
}

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

  const text = await callOpenRouterWithFallback([
    {
      role: "system",
      content: "You are a senior security engineer. You must return only a valid JSON object matching the requested schema."
    },
    {
      role: "user",
      content: prompt
    }
  ]);

  const cleanedText = cleanJsonResponse(text);
  const parsed = JSON.parse(cleanedText);
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

  const text = await callOpenRouterWithFallback([
    {
      role: "system",
      content: "You are a senior security engineer. You must return only a valid JSON object matching the requested schema."
    },
    {
      role: "user",
      content: prompt
    }
  ]);

  const cleanedText = cleanJsonResponse(text);
  const parsed = JSON.parse(cleanedText);
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

