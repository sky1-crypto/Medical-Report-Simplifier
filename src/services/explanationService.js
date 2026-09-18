import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY
});

export const explainTests = async (tests) => {
  const response = await ai.models.generateContent({
    model: "gemini-3.5-flash-lite",
    contents: `
You are a medical report explanation system.

Explain ONLY the medical test results provided below.

Rules:
1. Do not add any tests.
2. Do not change any values.
3. Do not make a diagnosis.
4. Use simple patient-friendly language.
5. Keep explanations short.
6. Explain what an abnormal result may commonly indicate.
7. Return ONLY valid JSON.

Return exactly this format:

{
  "summary": "Low hemoglobin and high white blood cell count.",
  "explanations": [
    "Low hemoglobin may relate to anemia.",
    "High WBC can occur with infections."
  ]
}

Tests:
${JSON.stringify(tests)}
`,
    config: {
      responseMimeType: "application/json"
    }
  });

  const output = response.text;

  if (!output) {
    throw new Error("No explanation received from Gemini");
  }

  return JSON.parse(output);
};