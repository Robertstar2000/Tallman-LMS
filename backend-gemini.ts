import { GoogleGenAI, Type } from "@google/genai";
import { tallmanData } from "./backend-tallman.ts";

const cleanJsonResponse = (text: string): string => {
  if (!text) return "{}";
  // Remove markdown block wrappers
  let cleaned = text.replace(/```json\s*|```/g, "").trim();
  
  // Find boundaries
  const firstBrace = cleaned.indexOf('{');
  const firstBracket = cleaned.indexOf('[');
  const start = (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) ? firstBrace : firstBracket;
  
  const lastBrace = cleaned.lastIndexOf('}');
  const lastBracket = cleaned.lastIndexOf(']');
  const end = (lastBrace !== -1 && lastBrace > lastBracket) ? lastBrace : lastBracket;

  if (start !== -1 && end !== -1 && end > start) {
    cleaned = cleaned.substring(start, end + 1);
  }

  // Remove trailing commas before closing braces/brackets
  cleaned = cleaned.replace(/,(\s*[\]}])/g, "$1");
  
  // Remove control characters
  return cleaned.replace(/[\u0000-\u001F\u007F-\u009F]/g, " ").trim();
};

const getGroundingContext = () => {
  return `You are the Lead Industrial Architect for ${tallmanData.company.legal_name}. 
  EVERY response MUST be grounded in these specific facts:
  - Enterprise ERP: ${tallmanData.operations.systems_used[0]} (Epicor P21).
  - CRM: RubberTree.
  - Rental System: Point of Rental (POR).
  - Exclusive Distribution: ${tallmanData.ddin_products.brand}.
  - Manufacturing Partner: Bradley Machining (CNC Precision).
  - Hubs: Addison (HQ), Columbus, Lake City.
  - Industry Focus: Electrical Transmission and Distribution infrastructure.
  - Business Units: Sales, Rental, Testing, and Custom Manufacturing (Rope Assemblies).`;
};

export const generateCourseUnitTitles = async (courseTitle: string) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = `Generate a list of 15 to 25 unique, relevant unit titles for a technical training course called "${courseTitle}". 
  The titles should represent a logical progression of industrial mastery for Tallman Equipment Co employees.
  Return ONLY a JSON object: {"titles": ["Unit 1 Title", "Unit 2 Title", ...] }`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: prompt,
      config: {
        systemInstruction: `${getGroundingContext()} Create an industrial curriculum structure.`,
        responseMimeType: "application/json"
      }
    });
    const cleaned = cleanJsonResponse(response.text || "");
    return JSON.parse(cleaned);
  } catch (error) {
    console.error("AI Unit Titles Exception:", error);
    throw new Error(`Failed to generate units for "${courseTitle}".`);
  }
};

export const generateUnitManualAndQuiz = async (courseTitle: string, unitTitle: string) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const prompt = `Write a training manual and quiz for: "${courseTitle} - ${unitTitle}".
  
  INSTRUCTIONS FOR MANUAL:
  1. Target Audience: Learner at Tallman Equipment Co.
  2. Language: Written at a 10th grade reading level. Clear and industrial.
  3. Content: Explain the subject and provide a detailed SOP (Standard Operating Procedure) to work with or on the subject.
  4. Data: ANY numeric data, load ratings, or technical specs MUST be in a markdown table format.
  5. Context: Use ${tallmanData.operations.systems_used[0]}, ${tallmanData.ddin_products.brand} brand details, and Tallman branch locations where relevant.
  
  INSTRUCTIONS FOR QUIZ:
  1. Generate exactly 3 multiple-choice questions based ONLY on the manual content above.
  2. Each question MUST have exactly 4 possible answers.
  3. Only ONE answer is correct.
  
  Return ONLY a JSON object: 
  {
    "manual_content": "Markdown formatted manual text here",
    "quiz_questions": [
       {"question": "...", "options": ["Option A", "Option B", "Option C", "Option D"], "correctIndex": 0},
       ...
    ]
  }`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: prompt,
      config: {
        systemInstruction: `${getGroundingContext()} You are a Senior Technical Writer for a tool company.`,
        responseMimeType: "application/json"
      }
    });
    
    const data = JSON.parse(cleanJsonResponse(response.text || ""));
    
    // Randomize quiz answer order while keeping correctIndex accurate
    if (data.quiz_questions) {
      data.quiz_questions = data.quiz_questions.map((q: any) => {
        const originalCorrectOption = q.options[q.correctIndex];
        const shuffledOptions = [...q.options].sort(() => Math.random() - 0.5);
        const newCorrectIndex = shuffledOptions.indexOf(originalCorrectOption);
        return {
          ...q,
          options: shuffledOptions,
          correctIndex: newCorrectIndex
        };
      });
    }

    return data;
  } catch (error) {
    console.error("AI Unit Content Exception:", error);
    throw new Error(`Failed to generate manual/quiz for unit "${unitTitle}".`);
  }
};