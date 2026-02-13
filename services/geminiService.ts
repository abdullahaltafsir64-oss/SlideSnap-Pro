
import { GoogleGenAI, Type } from "@google/genai";
import { AISuggestion } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export const generateSocialContent = async (fileName: string, pageCount: number): Promise<AISuggestion> => {
  const prompt = `Analyze this document info: 
  File Name: ${fileName}
  Total Pages/Slides: ${pageCount}
  
  Please generate a social media strategy for a carousel post based on this document.
  Include:
  1. A catchy headline for the first slide.
  2. A comprehensive caption for the post.
  3. Trending hashtags related to professional document sharing.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            headline: { type: Type.STRING },
            caption: { type: Type.STRING },
            hashtags: { 
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
          },
          required: ["headline", "caption", "hashtags"]
        }
      }
    });

    return JSON.parse(response.text);
  } catch (error) {
    console.error("Gemini Error:", error);
    return {
      headline: "Master Your Workflow",
      caption: "Check out this document for some great insights!",
      hashtags: ["#Productivity", "#Workflow", "#KnowledgeSharing"]
    };
  }
};
