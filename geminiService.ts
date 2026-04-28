import { GoogleGenerativeAI } from "@google/generative-ai";
import { tallmanData } from "./backend-tallman";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.API_KEY || '';

if (!GEMINI_API_KEY) {
  console.warn("WARNING: Gemini API Key is missing. Check your Vite configuration.");
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

/**
 * Utility to handle exponential backoff for API rate limits (429)
 * and structural failures (like malformed JSON)
 */
async function withRetry<T>(fn: () => Promise<T>, maxRetries = 4, initialDelay = 5000): Promise<T> {
  let lastError: any;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      const isRateLimit = error?.message?.includes('429') || error?.status === 429;
      const isStructuralFailure = error?.message?.includes('Architectural Sync Failure');
      const isTimeout = error?.message?.toLowerCase().includes('timeout') || error?.message?.includes('DEADLINE_EXCEEDED') || error?.name === 'AbortError';

      if ((isRateLimit || isStructuralFailure || isTimeout) && i < maxRetries - 1) {
        const delay = initialDelay * Math.pow(2, i);
        console.warn(`${isTimeout ? 'Timeout' : isRateLimit ? 'Rate limit' : 'Architectural failure'} hit. Retrying in ${delay}ms... (Attempt ${i + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw error;
    }
  }
  throw lastError;
}

/**
 * Robust JSON extraction from AI responses.
 * Handles markdown wrappers, truncation, and embedded newlines.
 */
const cleanJsonResponse = (text: string): string => {
  if (!text) return "{}";

  // Stage 1: Strip markdown and sanitize broad control characters
  let cleaned = text.replace(/```json\s*|```/g, "").trim();

  // Find the first structural character
  const firstBrace = cleaned.indexOf('{');
  const firstBracket = cleaned.indexOf('[');
  let start = -1;
  if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
    start = firstBrace;
  } else if (firstBracket !== -1) {
    start = firstBracket;
  }

  if (start === -1) {
    const match = cleaned.match(/\{(?:.*)\}/s);
    if (match) return match[0];
    return "{}";
  }

  cleaned = cleaned.substring(start);

  // Stage 2: Structural Repair for Truncation/Malformed Strings
  const stack: string[] = [];
  let inString = false;
  let escaped = false;
  let result = "";

  for (let i = 0; i < cleaned.length; i++) {
    const char = cleaned[i];

    if (char === '"' && !escaped) {
      inString = !inString;
    }

    // Handle unescaped newlines inside strings by converting to \\n
    if (inString && (char === '\n' || char === '\r')) {
      result += "\\n";
      continue;
    }

    if (!inString) {
      if (char === '{' || char === '[') stack.push(char === '{' ? '}' : ']');
      else if (char === '}' || char === ']') {
        if (stack.length > 0 && stack[stack.length - 1] === char) stack.pop();
      }
    }

    result += char;
    escaped = char === '\\' && !escaped;
  }

  cleaned = result;

  // Handle Truncation
  if (stack.length > 0) {
    let repair = cleaned.trim();
    if (inString) repair += '"';
    repair = repair.replace(/[,:\s]+$/, "");
    repair += stack.reverse().join("");
    cleaned = repair;
  }

  // Final sanitization of common JSON errors
  return cleaned
    .replace(/,(\s*[\]}])/g, "$1") // Remove trailing commas
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, (c) => c === '\n' || c === '\r' || c === '\t' ? c : "") // Preserve standard whitespace
    .trim();
};

const SYSTEM_CONTEXT = `You are the Lead Industrial Architect for ${tallmanData.company.legal_name}. 
Your expertise covers:
- Epertise to generate instructional courses on a varity of supjects. When relevent to the course tipic include:
-- Electrical Transmission/Distribution engineering.
-- Industrial SOP development.
-- Enterprise systems: Epicor P21 (ERP), RubberTree (CRM).
-- Tooling brands: DDIN, Bradley Machining (CNC Precision).
-- Operational locations: Addison (HQ), Columbus, Lake City.`;

const OLLAMA_ENDPOINT = 'http://10.10.20.60:11434/api/chat';
const OLLAMA_MODEL = 'gemma4:26b';

/**
 * Attempts to generate content using the primary Ollama model.
 * If it fails (network error, timeout, or parsing error if JSON is expected),
 * falls back to Gemini.
 */
async function generateWithFallback(
  systemInstruction: string,
  userPrompt: string,
  requireJSON: boolean,
  geminiCall: () => Promise<string>
): Promise<string> {
  try {
    console.log(`[Ollama] Attempting generation with ${OLLAMA_MODEL}...`);
    const payload: any = {
      model: OLLAMA_MODEL,
      messages: [
        { role: 'system', content: systemInstruction },
        { role: 'user', content: userPrompt }
      ],
      stream: false
    };

    if (requireJSON) {
      payload.format = "json";
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 minute timeout

    const res = await fetch(OLLAMA_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      throw new Error(`Ollama HTTP Error: ${res.status}`);
    }

    const data = await res.json();
    let text = data.message?.content || "";
    
    // Quick validation if JSON is required
    if (requireJSON) {
      const cleaned = cleanJsonResponse(text);
      JSON.parse(cleaned); // Will throw if invalid
      return text;
    }

    return text;
  } catch (error: any) {
    console.warn(`[Ollama] Generation failed, falling back to Gemini... Reason: ${error.message}`);
    // Fallback to Gemini
    return await geminiCall();
  }
}

export const generateCourseOutline = async (topic: string, unitCount: number = 12) => {
  return withRetry(async () => {
    try {
      const promptText = `Draft a ${unitCount}-unit technical curriculum outline for: "${topic}". 
        Each unit needs a title and a brief description.
        Return as valid JSON: { "titles": ["Unit 1", "Unit 2", ...], "descriptions": ["Desc 1", "Desc 2", ...] }`;

      const responseText = await generateWithFallback(
        SYSTEM_CONTEXT,
        promptText,
        true,
        async () => {
          const model = genAI.getGenerativeModel({
            model: "gemini-2.5-flash",
            systemInstruction: SYSTEM_CONTEXT
          }, { timeout: 300000 });
          const result = await model.generateContent({
            contents: [{ role: 'user', parts: [{ text: promptText }] }],
            generationConfig: { responseMimeType: "application/json" }
          });
          return result.response.text() || "";
        }
      );

      const cleaned = cleanJsonResponse(responseText);
      return JSON.parse(cleaned);
    } catch (error: any) {
      const isRetryable = error?.message?.includes('429') || error?.message?.toLowerCase().includes('timeout') || error?.name === 'AbortError' || error?.message?.includes('DEADLINE_EXCEEDED');
      if (!isRetryable) {
        console.error("Gemini Outline Critical Error:", error.message);
      }
      throw error;
    }
  });
};

/**
 * Generate unit content (manual + quiz) from AI.
 * Uses a two-call approach to avoid JSON corruption from huge embedded markdown.
 */
export const generateUnitContent = async (courseTitle: string, unitTitle: string) => {
  return withRetry(async () => {
    try {
      // Call 1: Generate the manual content as plain text (no JSON wrapping)
      const manualPrompt = `Write an exhaustive, instructional Technical Manual for the unit: "${courseTitle} - ${unitTitle}".
        
        REQUIREMENTS:
        - TARGET LENGTH: At least 1500 words. Dense, professional instructional document.
        - PRIMARY CONTENT FOCUS: The content MUST be focused entirely on the specific business or technical subject.
        - OPERATIONAL WRAPPER: Integrate ${tallmanData.company.common_name} operational context (Epicor P21, RubberTree, DDIN) only where relevant.
        - STRUCTURE: Use professional Markdown with:
          - Table of Contents
          - Technical Fundamentals
          - Step-by-Step SOPs where relevant
          - Industry Standards
          - Troubleshooting/Specs
        
        Return ONLY the Markdown content. Do NOT wrap in JSON. Do NOT include quiz questions.`;

      const manualContent = await generateWithFallback(
        SYSTEM_CONTEXT,
        manualPrompt,
        false,
        async () => {
          const model = genAI.getGenerativeModel({
            model: "gemini-2.5-flash",
            systemInstruction: SYSTEM_CONTEXT
          }, { timeout: 300000 });
          const manualResult = await model.generateContent({
            contents: [{ role: 'user', parts: [{ text: manualPrompt }] }],
            generationConfig: { maxOutputTokens: 8192, temperature: 0.5 }
          });
          return manualResult.response.text() || '';
        }
      );

      // Call 2: Generate quiz as structured JSON (small payload, reliable)
      const quizPrompt = `Generate exactly 3 multiple-choice quiz questions about: "${courseTitle} - ${unitTitle}".
        
        Each question must have exactly 4 options and a correctIndex (0-3).
        
        Return as valid JSON array:
        [
          {"question": "...", "options": ["A", "B", "C", "D"], "correctIndex": 0},
          {"question": "...", "options": ["A", "B", "C", "D"], "correctIndex": 1},
          {"question": "...", "options": ["A", "B", "C", "D"], "correctIndex": 2}
        ]`;

      const quizResponseText = await generateWithFallback(
        SYSTEM_CONTEXT,
        quizPrompt,
        true,
        async () => {
          const model = genAI.getGenerativeModel({
            model: "gemini-2.5-flash",
            systemInstruction: SYSTEM_CONTEXT
          }, { timeout: 300000 });
          const quizResult = await model.generateContent({
            contents: [{ role: 'user', parts: [{ text: quizPrompt }] }],
            generationConfig: {
              responseMimeType: "application/json",
              maxOutputTokens: 2048,
              temperature: 0.5
            }
          });
          return quizResult.response.text() || "[]";
        }
      );

      const quizCleaned = cleanJsonResponse(quizResponseText);
      let quiz = JSON.parse(quizCleaned);
      
      // Normalize: if the response is wrapped in an object, extract the array
      if (!Array.isArray(quiz)) {
        quiz = quiz.quiz || quiz.questions || quiz.quiz_questions || [];
      }

      return { content: manualContent, quiz };
    } catch (error: any) {
      const isRetryable = error?.message?.includes('429') || error?.message?.toLowerCase().includes('timeout') || error?.name === 'AbortError' || error?.message?.includes('DEADLINE_EXCEEDED');
      if (!isRetryable) {
        console.error("Gemini Content Critical Error:", error.message);
      }
      throw error;
    }
  }, 4, 10000);
};

/**
 * Generate ONLY quiz questions for a unit (used separately from content generation)
 */
export const generateQuizOnly = async (courseTitle: string, unitTitle: string) => {
  return withRetry(async () => {
    const promptText = `Generate exactly 3 multiple-choice quiz questions about: "${courseTitle} - ${unitTitle}".
        Each question must have exactly 4 options and a correctIndex (0-3).
        Return as valid JSON array:
        [{"question": "...", "options": ["A", "B", "C", "D"], "correctIndex": 0}]`;

    const responseText = await generateWithFallback(
      SYSTEM_CONTEXT,
      promptText,
      true,
      async () => {
        const model = genAI.getGenerativeModel({
          model: "gemini-2.5-flash",
          systemInstruction: SYSTEM_CONTEXT
        }, { timeout: 120000 });
        const result = await model.generateContent({
          contents: [{ role: 'user', parts: [{ text: promptText }] }],
          generationConfig: {
            responseMimeType: "application/json",
            maxOutputTokens: 2048,
            temperature: 0.5
          }
        });
        return result.response.text() || "[]";
      }
    );

    const cleaned = cleanJsonResponse(responseText);
    let quiz = JSON.parse(cleaned);
    if (!Array.isArray(quiz)) {
      quiz = quiz.quiz || quiz.questions || quiz.quiz_questions || [];
    }
    return quiz;
  }, 3, 5000);
};

export const generateCourseThumbnail = async (topic: string) => {
  // Return a preset image - no runtime generation
  return 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=600&auto=format&fit=crop';
};