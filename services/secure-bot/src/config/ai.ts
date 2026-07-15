/**
 * Copyright (c) 2026 Keshav Gilhotra. All Rights Reserved.
 * This file is part of a proprietary project. Unauthorized copying is strictly prohibited.
 */

import OpenAI from 'openai'

const client = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY!,
})

const geminiClient = process.env.GEMINI_API_KEY
  ? new OpenAI({
      baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/',
      apiKey: process.env.GEMINI_API_KEY,
    })
  : null

function cleanJsonResponse(text: string): string {
  let cleaned = text.trim()
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```[a-zA-Z]*\s*/, '')
    cleaned = cleaned.replace(/\s*```$/, '')
  }
  return cleaned.trim()
}

async function callOpenRouterWithFallback(
  messages: { role: 'system' | 'user' | 'assistant'; content: string }[],
): Promise<string> {
  // Try native Google Gemini endpoint first using GEMINI_API_KEY
  if (geminiClient) {
    const geminiModels = ['gemini-2.5-flash', 'gemini-1.5-flash']
    for (const model of geminiModels) {
      try {
        console.log(`[Gemini API] Attempting completion with model: ${model}`)
        const response = await geminiClient.chat.completions.create({
          model,
          messages,
        })
        const text = response.choices[0]?.message?.content
        if (text) {
          console.log(`[Gemini API] Successfully got response from model: ${model}`)
          return text
        }
      } catch (error: any) {
        console.warn(
          `[Gemini API] Model ${model} failed:`,
          error.message || error,
        )
      }
    }
  }

  // Fallback to OpenRouter free models
  const models = [
    'qwen/qwen3-coder:free',
    'google/gemma-4-31b-it:free',
    'meta-llama/llama-3.3-70b-instruct:free',
    'openrouter/free',
    'meta-llama/llama-3.2-3b-instruct:free',
  ]

  let lastError: any = null
  for (const model of models) {
    try {
      console.log(`[OpenRouter] Attempting completion with model: ${model}`)
      const response = await client.chat.completions.create({
        model,
        messages,
      })
      const text = response.choices[0]?.message?.content
      if (text) {
        console.log(`[OpenRouter] Successfully got response from model: ${model}`)
        return text
      }
    } catch (error: any) {
      console.warn(
        `[OpenRouter] Model ${model} failed or rate-limited:`,
        error.message || error,
      )
      lastError = error
    }
  }

  throw lastError || new Error('All fallback models failed to return a response.')
}

interface Finding {
  title: string
  description: string
  filePath: string
}

export async function getCodeFix(
  finding: Finding,
  fileContent: string,
  context: string,
): Promise<{ explanation: string; fixedCode: string }> {
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
`

  const text = await callOpenRouterWithFallback([
    {
      role: 'system',
      content:
        'You are a senior security engineer. You must return only a valid JSON object matching the requested schema.',
    },
    {
      role: 'user',
      content: prompt,
    },
  ])

  const cleanedText = cleanJsonResponse(text)
  const parsed = JSON.parse(cleanedText)
  const target = parsed.targetContent ?? ''
  const replacement = parsed.replacementContent ?? ''

  let updatedCode = fileContent.replace(/\r\n/g, '\n')
  const normalizedTarget = (target ?? '').replace(/\r\n/g, '\n')
  const normalizedReplacement = (replacement ?? '').replace(/\r\n/g, '\n')
  const normalizedContext = (context ?? '').replace(/\r\n/g, '\n')

  if (normalizedTarget && updatedCode.includes(normalizedTarget)) {
    updatedCode = updatedCode.replace(normalizedTarget, normalizedReplacement)
  } else if (normalizedTarget) {
    // Fallback: if exact match fails, try replacing in context
    console.warn('Exact target match failed, attempting context fallback.')
    if (normalizedContext.includes(normalizedTarget)) {
      const updatedContext = normalizedContext.replace(
        normalizedTarget,
        normalizedReplacement,
      )
      updatedCode = updatedCode.replace(normalizedContext, updatedContext)
    }
  }

  return {
    explanation: parsed.explanation ?? '',
    fixedCode: updatedCode,
  }
}

interface FileFinding {
  title: string
  description: string
  line: number
}

export async function getMultipleCodeFixes(
  filePath: string,
  fileContent: string,
  findings: FileFinding[],
): Promise<{ explanation: string; fixedCode: string }> {
  const findingsText = findings
    .map(
      (f, i) => `
Finding #${i + 1}:
Title: ${f.title}
Line: ${f.line}
Description: ${f.description}
`,
    )
    .join('\n---\n')

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
`

  const text = await callOpenRouterWithFallback([
    {
      role: 'system',
      content:
        'You are a senior security engineer. You must return only a valid JSON object matching the requested schema.',
    },
    {
      role: 'user',
      content: prompt,
    },
  ])

  const cleanedText = cleanJsonResponse(text)
  const parsed = JSON.parse(cleanedText)
  let updatedCode = fileContent.replace(/\r\n/g, '\n')
  if (parsed.edits && Array.isArray(parsed.edits)) {
    for (const edit of parsed.edits) {
      const target = edit.targetContent
      const replacement = edit.replacementContent
      const normalizedTarget = (target ?? '').replace(/\r\n/g, '\n')
      const normalizedReplacement = (replacement ?? '').replace(/\r\n/g, '\n')

      if (normalizedTarget && updatedCode.includes(normalizedTarget)) {
        updatedCode = updatedCode.replace(normalizedTarget, normalizedReplacement)
      } else if (normalizedTarget) {
        console.warn(`Could not find target content for edit: ${target}`)
      }
    }
  }

  return {
    explanation: parsed.explanation ?? '',
    fixedCode: updatedCode,
  }
}

export async function getPrReviewsByDiffs(diff: any) {
  const prompt = `
You are a friendly, constructive senior developer and code reviewer.
Review the following git diff of a Pull Request:

\`\`\`diff
${diff}
\`\`\`

Provide a high-quality, friendly code review in the style of CodeRabbit:
1. Tone: Conversational, helpful, and developer-friendly. Avoid clinical "scanner-like" jargon (e.g. do not say "Finding #1", "Severity: Critical"). Instead, say "I noticed that...", "To make this more secure, we can...", etc.
2. Review categories:
   - Security: Vulnerabilities, hardcoded secrets, injection, XSS, etc.
   - Bug: Logical bugs, duplicate routes, concurrency issues, runtime errors.
   - Refactor: Code style, optimization, formatting, clean code practices.

Return ONLY a valid JSON object matching the following schema structure:
{
  "summary": "A friendly overview of the PR's goal and overall code quality.",
  "walkthrough": [
    {
      "filePath": "relative/path/to/file.ts",
      "summary": "A quick one-sentence summary of what changed in this file."
    }
  ],
  "comments": [
    {
      "category": "Security", // Must be "Security", "Bug", or "Refactor"
      "filePath": "relative/path/to/file.ts",
      "line": 27,
      "description": "Constructive review comment written in a friendly tone.",
      "suggestion": "Optional exact replacement code snippet if applicable."
    }
  ]
}
`

  try {
    const text = await callOpenRouterWithFallback([
      {
        role: 'system',
        content:
          'You are a senior code reviewer. You must return only a valid JSON object matching the requested schema.',
      },
      {
        role: 'user',
        content: prompt,
      },
    ])

    const cleanedText = cleanJsonResponse(text)
    const parsed = JSON.parse(cleanedText)
    const result = {
      summary: parsed.summary || 'PR reviewed successfully.',
      walkthrough: parsed.walkthrough || [],
      comments: parsed.comments || [],
    }
    return {
      ...result,
      reviewBody: formatPrReviewComment(result),
    }
  } catch (error) {
    console.error(
      'Failed to get or parse structured PR review, returning raw text as summary:',
      error,
    )
    const result = {
      summary:
        'Could not generate structured review. Diff analysis error or JSON parsing failed.',
      walkthrough: [],
      comments: [],
    }
    return {
      ...result,
      reviewBody: formatPrReviewComment(result),
    }
  }
}

export function formatPrReviewComment(reviews: any): string {
  // Format a beautiful markdown body for the PR comment in CodeRabbit style
  let body = `## 🤖 CyberSuite AI Code Review\n\n`
  body += `### 📝 Summary\n${reviews.summary}\n\n`

  // 1. Walkthrough Table
  if (reviews.walkthrough && reviews.walkthrough.length > 0) {
    body += `### 📂 Walkthrough\n`
    body += `| File | Summary |\n`
    body += `| :--- | :--- |\n`
    reviews.walkthrough.forEach((w: any) => {
      body += `| \`${w.filePath}\` | ${w.summary} |\n`
    })
    body += `\n`
  }

  // Helper to format suggestion code blocks
  const formatSuggestion = (filePath: string, suggestion: string) => {
    const ext = filePath.split('.').pop() || ''
    const lang = [
      'js',
      'ts',
      'py',
      'go',
      'rs',
      'java',
      'cpp',
      'c',
      'html',
      'css',
      'json',
      'yaml',
      'yml',
      'dockerfile',
    ].includes(ext.toLowerCase())
      ? ext.toLowerCase()
      : ''
    const nestedLines = suggestion
      .split('\n')
      .map((line) => `> ${line}`)
      .join('\n')
    return `>\n> **Suggested Fix:**\n> \`\`\`${lang}\n${nestedLines}\n> \`\`\`\n`
  }

  // 2. Categorized detailed comments
  const comments = reviews.comments || []
  const securityComments = comments.filter((c: any) => c.category === 'Security')
  const bugComments = comments.filter((c: any) => c.category === 'Bug')
  const refactorComments = comments.filter((c: any) => c.category === 'Refactor')

  if (comments.length > 0) {
    body += `### 🔍 Suggestions & Feedback\n\n`

    if (securityComments.length > 0) {
      body += `#### ⚠️ Security & Vulnerabilities\n`
      securityComments.forEach((c: any) => {
        body += `* **\`${c.filePath}\` (Line ${c.line})**: ${c.description}\n`
        if (c.suggestion) {
          body += formatSuggestion(c.filePath, c.suggestion)
        }
      })
      body += `\n`
    }

    if (bugComments.length > 0) {
      body += `#### 🐛 Logic & Bugs\n`
      bugComments.forEach((c: any) => {
        body += `* **\`${c.filePath}\` (Line ${c.line})**: ${c.description}\n`
        if (c.suggestion) {
          body += formatSuggestion(c.filePath, c.suggestion)
        }
      })
      body += `\n`
    }

    if (refactorComments.length > 0) {
      body += `#### 💡 Style & Refactoring\n`
      refactorComments.forEach((c: any) => {
        body += `* **\`${c.filePath}\` (Line ${c.line})**: ${c.description}\n`
        if (c.suggestion) {
          body += formatSuggestion(c.filePath, c.suggestion)
        }
      })
      body += `\n`
    }
  } else {
    body += `✨ No concerns found. Your code looks clean, safe, and ready to go!`
  }

  return body
}
