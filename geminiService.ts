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
    // Stage 3: Brute Force Extraction if no standard start found
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

    // Detect string boundaries
    if (char === '"' && !escaped) {
      inString = !inString;
    }

    // Handle unescaped newlines inside strings by converting to \n
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

export const generateCourseOutline = async (topic: string) => {
  return withRetry(async () => {
    try {
      const model = genAI.getGenerativeModel({
        model: "gemini-3-flash-preview",
        systemInstruction: SYSTEM_CONTEXT
      }, { timeout: 300000 });
      const result = await model.generateContent({
        contents: [{
          role: 'user', parts: [{
            text: `Draft an 12-unit technical curriculum outline for: "${topic}". 
        Each unit needs a title and a brief description.
        Return as valid JSON: { "titles": ["Unit 1", "Unit 2", ...], "descriptions": ["Desc 1", "Desc 2", ...] }` }]
        }],
        generationConfig: {
          responseMimeType: "application/json"
        }
      });
      const cleaned = cleanJsonResponse(result.response.text() || "");
      return JSON.parse(cleaned);
    } catch (error: any) {
      const isRetryable = error?.message?.includes('429') || error?.message?.toLowerCase().includes('timeout') || error?.name === 'AbortError' || error?.message?.includes('DEADLINE_EXCEEDED');
      if (!isRetryable) {
        console.error("Gemini Outline Critical Error:", error);
      }
      throw error;
    }
  });
};

export const generateUnitContent = async (courseTitle: string, unitTitle: string) => {
  return withRetry(async () => {
    try {
      const model = genAI.getGenerativeModel({
        model: "gemini-3-flash-preview",
        systemInstruction: SYSTEM_CONTEXT
      }, { timeout: 300000 }); // High-clearance 5-minute timeout
      const result = await model.generateContent({
        contents: [{
          role: 'user', parts: [{
            text: `Generate an exhaustive, instructional Technical Manual and a 3-question Quiz for the unit: "${courseTitle} - ${unitTitle}".
        
        CRITICAL ARCHITECTURAL RULES:
        1. YOU MUST OUTPUT VALID JSON.
        2. ESCAPE ALL DOUBLE QUOTES INSIDE STRINGS USING \\".
        3. ENSURE NEWLINES ARE REPRESENTED AS \\n.
        
        REQUIREMENTS FOR THE MANUAL:
        - TARGET LENGTH: At least 2200 words. This must be an extremely dense, professional, and exhaustive instructional document.
        - PRIMARY CONTENT FOCUS: The instructional content MUST be focused entirely on the specific bussiness or technical subject defined by the titles.
        - OPERATIONAL WRAPPER: Integrate ${tallmanData.company.common_name} operational context (Epicor P21, RubberTree, DDIN) only where relevant for logging or tooling.
        - STRUCTURE: Use professional Markdown with:
          - Table of Contents
          - Technical Fundamentals
          - Multi-phase Phase SOPs
          - Industry Standards
          - Troubleshooting/Specs
        - EXCLUSION: DO NOT include the Quiz questions or answers within the "content" (Manual) field itself. The quiz MUST only exist as a separate object in the "quiz" array.
          
        REQUIREMENTS FOR THE QUIZ:
        - 3 multiple-choice questions with 4 options each and a correctIndex (0-3).
        
        Return JSON structure: 
        { 
          "content": "Full Markdown Manual here...", 
          "quiz": [
            {"question": "...", "options": ["A", "B", "C", "D"], "correctIndex": 0}
          ] 
        }` }]
        }],
        generationConfig: {
          responseMimeType: "application/json",
          maxOutputTokens: 8192,
          temperature: 0.5
        }
      });
      const text = result.response.text();
      const cleaned = cleanJsonResponse(text || "");
      try {
        return JSON.parse(cleaned);
      } catch (e: any) {
        // Fallback: If JSON.parse still fails, try extraction
        console.warn("Attempting Regex-based Course Reconstruction...");
        const contentMatch = cleaned.match(/"content":\s*"(.*)",\s*"quiz":/s);
        const quizMatch = cleaned.match(/"quiz":\s*(\[.*\])/s);

        if (contentMatch && quizMatch) {
          try {
            return {
              content: contentMatch[1].replace(/\\"/g, '"').replace(/\\n/g, '\n'),
              quiz: JSON.parse(cleanJsonResponse(quizMatch[1]))
            };
          } catch (innerE) {
            // Continue to throw if extraction also fails
          }
        }

        console.error("Architectural JSON Sync Failed. Content length:", cleaned?.length);
        console.error("Raw Content Sample:", cleaned?.substring(cleaned.length - 100));
        throw new Error(`Architectural Sync Failure: Malformed JSON output. The document density was too high for reliable parsing. Try Regenerating.`);
      }
    } catch (error: any) {
      const isRetryable = error?.message?.includes('429') || error?.message?.toLowerCase().includes('timeout') || error?.name === 'AbortError' || error?.message?.includes('DEADLINE_EXCEEDED');
      if (!isRetryable) {
        console.error("Gemini Content Critical Error:", error);
      }
      throw error;
    }
  }, 7, 10000); // 7 retries with 10s initial delay
};

export const generateCourseThumbnail = async (topic: string) => {
  return withRetry(async () => {
    try {
      // Utilizing the 'Nano Banana Pro' architecture (Gemini 3 Pro Image)
      // for direct, autonomous industrial visual synthesis.
      const model = genAI.getGenerativeModel({
        model: "gemini-3-pro-image-preview"
      }, { timeout: 300000 });

      const prompt = `Professional cinematic industrial photography of ${topic}. 
      High-tech technical equipment, 8k resolution, professional lighting, sharp metallic textures, depth of field. 
      Unique technical perspective.`;

      const result = await model.generateContent(prompt);
      const response = await result.response;

      const parts = response.candidates?.[0]?.content?.parts || [];
      const imagePart = parts.find(p => p.inlineData);

      if (imagePart && imagePart.inlineData) {
        return `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`;
      }

      throw new Error("Visual Synthesis Failure: No image data returned from registry.");
    } catch (error: any) {
      console.error("Visual Sync Architecture Error:", error);
      // Fallback protocol: Attempt a secondary high-clearance image render
      const fallbackPrompt = encodeURIComponent(`Professional industrial photography of ${topic}, 8k, cinematic`);
      const randomSeed = Math.floor(Math.random() * 100000);
      return `https://image.pollinations.ai/prompt/${fallbackPrompt}?width=1280&height=720&seed=${randomSeed}&nologo=true&model=flux`;
    }
  });
};