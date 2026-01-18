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
async function withRetry<T>(fn: () => Promise<T>, maxRetries = 3, initialDelay = 2000): Promise<T> {
  let lastError: any;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      const isRateLimit = error?.message?.includes('429') || error?.status === 429;
      // Also retry if we specifically hit a structural sync failure (LLM cut off JSON)
      const isStructuralFailure = error?.message?.includes('Architectural Sync Failure');

      if ((isRateLimit || isStructuralFailure) && i < maxRetries - 1) {
        const delay = initialDelay * Math.pow(2, i);
        console.warn(`${isRateLimit ? 'Rate limit' : 'Architectural failure'} hit. Retrying in ${delay}ms... (Attempt ${i + 1}/${maxRetries})`);
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

  // Remove markdown block wrappers regardless of content
  let cleaned = text.replace(/```json\s*|```/g, "").trim();

  // Find the first and last structural characters
  const firstBrace = cleaned.indexOf('{');
  const firstBracket = cleaned.indexOf('[');
  let start = -1;
  if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
    start = firstBrace;
  } else if (firstBracket !== -1) {
    start = firstBracket;
  }

  const lastBrace = cleaned.lastIndexOf('}');
  const lastBracket = cleaned.lastIndexOf(']');
  let end = -1;
  if (lastBrace !== -1 && lastBrace > lastBracket) {
    end = lastBrace;
  } else if (lastBracket !== -1) {
    end = lastBracket;
  }

  if (start !== -1 && end !== -1 && end > start) {
    cleaned = cleaned.substring(start, end + 1);
  }

  // Handle common LLM JSON malformations in long strings
  // 1. Remove trailing commas before closing braces/brackets
  cleaned = cleaned.replace(/,(\s*[\]}])/g, "$1");

  // 2. Remove illegal control characters that crash JSON.parse
  cleaned = cleaned.replace(/[\u0000-\u0008\u000B-\u000C\u000E-\u001F\u007F-\u009F]/g, "");

  return cleaned.trim();
};

const SYSTEM_CONTEXT = `You are the Lead Industrial Architect for ${tallmanData.company.legal_name}. 
Your expertise covers:
- Epertise to generate instructional courses on a varity of supjects. When relevent to the course tipic include:
- Electrical Transmission/Distribution engineering.
- Industrial SOP development.
- Enterprise systems: Epicor P21 (ERP), RubberTree (CRM).
- Tooling brands: DDIN, Bradley Machining (CNC Precision).
- Operational locations: Addison (HQ), Columbus, Lake City.`;

export const generateCourseOutline = async (topic: string) => {
  return withRetry(async () => {
    try {
      const model = genAI.getGenerativeModel({
        model: "gemini-3-flash-preview",
        systemInstruction: SYSTEM_CONTEXT
      });
      const result = await model.generateContent({
        contents: [{
          role: 'user', parts: [{
            text: `Draft an 12-unit technical curriculum outline for: "${topic}". 
        Each unit needs a title and a brief description.
        Return as JSON: { "titles": ["Unit 1", "Unit 2", ...], "descriptions": ["Desc 1", "Desc 2", ...] }` }]
        }],
        generationConfig: {
          responseMimeType: "application/json"
        }
      });
      const cleaned = cleanJsonResponse(result.response.text() || "");
      return JSON.parse(cleaned);
    } catch (error) {
      console.error("Gemini Outline Error:", error);
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
      });
      const result = await model.generateContent({
        contents: [{
          role: 'user', parts: [{
            text: `Generate an exhaustive, instructional Technical Manual and a 3-question Quiz for the unit: "${courseTitle} - ${unitTitle}".
        
        REQUIREMENTS FOR THE MANUAL:
        - TARGET LENGTH: At least 2200 words. This must be an extremely dense, professional, and exhaustive instructional document.
        - PRIMARY CONTENT FOCUS: The instructional content MUST be focused entirely on the specific bussiness or technical subject defined by the titles. You are teaching the science of the topic,and execution of this specific topic.
        - OPERATIONAL WRAPPER (Contextual Grounding): Use the provided enterprise data ONLY as where relivent to the topic. This includes business info, ERP usage (Epicor P21), CRM logging (RubberTree), and specific tool brands (DDIN, Bradley Machining). Use these for explaining how the work is logged, what tools are used, and our corporate manufacturing standards.
        - IMPORTANT: Do NOT use the company data as the primary subject matter. The primary subject matter is the topic.
        - STRUCTURE: Use professional Markdown including:
          1. Detailed Technical Table of Contents.
          2. Comprehensive Subject Explanation & Technical Fundamentals.
          3. Industry-Standard Best Practices .
          5. Include where relivent Multi-phase Step-by-Step SOP (Standard Operating Procedure).
          6. Technical Specifications.

        REQUIREMENTS FOR THE QUIZ:
        - 3 multiple-choice questions with 4 options each and a correctIndex.
        - The questions should be based on the content of the manual and be displayed in random order. with only one correct answer. 
        
        Return JSON: { "content": "Markdown...", "quiz": [{"question": "...", "options": ["...", "..."], "correctIndex": 0}, ...] }` }]
        }],
        generationConfig: {
          responseMimeType: "application/json",
          maxOutputTokens: 8192,
          temperature: 0.7
        }
      });
      const text = result.response.text();
      const cleaned = cleanJsonResponse(text || "");
      try {
        return JSON.parse(cleaned);
      } catch (e: any) {
        console.error("Architectural JSON Sync Failed. Content length:", cleaned?.length);
        throw new Error(`Architectural Sync Failure: Malformed JSON output. The document density was too high for reliable parsing. Try Regenerating.`);
      }
    } catch (error) {
      console.error("Gemini Content Error:", error);
      throw error;
    }
  }, 3, 5000);
};

export const generateCourseThumbnail = async (topic: string) => {
  return withRetry(async () => {
    try {
      // Utilizing the 'Nano Banana Pro' architecture (Gemini 3 Pro Image)
      // for direct, autonomous industrial visual synthesis.
      const model = genAI.getGenerativeModel({
        model: "gemini-3-pro-image-preview"
      });

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