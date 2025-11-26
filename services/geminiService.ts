import { GoogleGenAI, Type } from "@google/genai";
import { NestingStats } from "../types";

export const analyzeNestingResult = async (apiKey: string, stats: NestingStats, material: string = "Standard Steel") => {
  if (!apiKey) throw new Error("API Key is missing");

  const ai = new GoogleGenAI({ apiKey });

  const prompt = `
    You are an expert Industrial Engineer specializing in material yield and CNC nesting optimization.
    
    Review the following nesting operation data:
    - Material Type: ${material}
    - Total Sheets Used: ${stats.totalSheets}
    - Global Efficiency: ${stats.globalEfficiency.toFixed(2)}%
    - Waste Area: ${stats.wasteArea.toFixed(2)} sq units
    - Parts Placed: ${stats.placedParts}/${stats.totalParts}

    Provide a structured analysis in JSON format.
    The 'score' should be an integer 0-100 evaluating the efficiency (industry standard for this material is usually 80%+).
    'recommendations' should be a list of 3 specific technical tips to improve yield (e.g., nesting algorithms, part geometry changes, sheet size selection).
    'summary' should be a professional executive summary of the job.
    'materialGrade' is a brief assessment of cost efficiency.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            score: { type: Type.INTEGER },
            summary: { type: Type.STRING },
            recommendations: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            materialGrade: { type: Type.STRING }
          }
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");
    
    return JSON.parse(text);

  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    throw error;
  }
};
