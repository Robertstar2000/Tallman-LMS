# Tallman LMS: Course Generation Framework (AI Architect)

This document outlines the specific system instructions, prompts, and architectural requirements used by the Gemini AI to generate and regenerate technical curriculum within the Tallman LMS ecosystem.

---

## 1. System Instruction (Master Context)
Every AI request is grounded in this system instruction to ensure the output aligns with Tallman's corporate identity and operational standards.

**Context:**
> You are the Lead Industrial Architect for Tallman Equipment Co.
> Your expertise covers:
> - Epertise to generate instructional courses on a varity of supjects. When relevent to the course tipic include:
> - Electrical Transmission/Distribution engineering.
> - Industrial SOP development.
> - Enterprise systems: Epicor P21 (ERP), RubberTree (CRM).
> - Tooling brands: DDIN, Bradley Machining (CNC Precision).
> - Operational locations: Addison (HQ), Columbus, Lake City.

---

## 2. Phase 1: Curriculum Outline Generation
Used when **"Architecting a New Path"** or generating the initial structure of a course.

**AI Model:** `gemini-3-flash-preview` (2026 Frontier Class)
**Prompt:**
> Draft an 12-unit technical curriculum outline for: **"{topic}"**. 
> Each unit needs a title and a brief description.
> **Return as JSON:** 
> ```json
> { 
>   "titles": ["Unit 1", "Unit 2", ...], 
>   "descriptions": ["Desc 1", "Desc 2", ...] 
> }
> ```

---

## 3. Phase 2: Unit Content & Audit Generation
Used to generate the exhaustive training materials on subjects like strategy, management, human resources, or technical manuals (SOPs) with safety insturctions for each specific unit.

**AI Model:** `gemini-3-flash-preview` (2026 Frontier Class)
**Prompt:**
> Generate an exhaustive, instructional Technical Manual and a 3-question Quiz for the unit: **"{courseTitle} - {unitTitle}"**.
> 
> ### REQUIREMENTS FOR THE MANUAL:
> - **TARGET LENGTH:** At least 2200 words. This must be an extremely dense, professional, and exhaustive instructional document.
> - **PRIMARY CONTENT FOCUS:** The instructional content MUST be focused entirely on the specific bussiness or technical subject defined by the titles. You are teaching the science of the topic,and execution of this specific topic.
> - **OPERATIONAL WRAPPER (Contextual Grounding):** Use the provided enterprise data ONLY as where relivent to the topic. This includes business info, ERP usage (Epicor P21), CRM logging (RubberTree), and specific tool brands (DDIN, Bradley Machining). Use these for explaining how the work is logged, what tools are used, and our corporate manufacturing standards.
> - **IMPORTANT:** Do NOT use the company data as the primary subject matter. The primary subject matter is the topic.
> - **STRUCTURE:** Use professional Markdown including:
>   1. Detailed Technical Table of Contents.
>   2. Comprehensive Subject Explanation & Technical Fundamentals.
>   3. Industry-Standard Best Practices .
>   5. Include where relivent Multi-phase Step-by-Step SOP (Standard Operating Procedure).
>   6. Technical Specifications.
> 
> ### REQUIREMENTS FOR THE QUIZ:
> - 3 multiple-choice questions with 4 options each and a `correctIndex`.
> - The questions should be based on the content of the manual and be displayed in random order. with only one correct answer. 
> **Return JSON:** 
> ```json
> { 
>   "content": "Markdown...", 
>   "quiz": [
>     {
>       "question": "...", 
>       "options": ["...", "..."], 
>       "correctIndex": 0
>     }, 
>     ...
>   ] 
> }
> ```

---

## 4. Visual Identity (Visual Sync)
The system utilizing direct autonomous image synthesis to maintain high-fidelity branding.

**AI Model:** `gemini-3-pro-image-preview` (Nano Banana Pro)
**Logic:**
> Architect a professional cinematic industrial photograph anchor to the course topic. The system retrieves a raw binary image payload (inlineData) directly from the Google AI registry. This ensures that every curriculum path has a 100% unique, photorealistic visual identity representing the technical subject matter.

---

## 5. Architectural Safeguards
- **Sync Integrity:** The system uses `withRetry` logic with exponential backoff to mitigate AI rate limits.
- **Data Sanitization:** A `cleanJsonResponse` utility extracts and repairs structural JSON from AI responses to ensure the LMS registry remains valid even if the AI output includes markdown formatting or thought blocks.
- **Payload Stability:** Images are stored as Base64 data URLs directly in the database to ensure visual persistence without external link degradation.
