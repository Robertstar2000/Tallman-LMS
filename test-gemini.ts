import { generateCourseOutline } from './geminiService';
import dotenv from 'dotenv';
dotenv.config();

async function test() {
    try {
        console.log('Starting AI generation test...');
        const outline = await generateCourseOutline('Basics of Electrical Safety', 3);
        console.log('AI Generation Success:', JSON.stringify(outline, null, 2));
    } catch (err: any) {
        console.error('AI Generation Failed:', err.message || err);
    }
}

test();
