import { GoogleGenAI } from "@google/genai";
import { extractionSchema } from "../schemas/reportSchema.js";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY
});

export const extractTests = async (reportText) => {
  const response = await ai.models.generateContent({
    model: "gemini-3.5-flash-lite",
   contents: `
You are a medical report test extraction system.

Your task is to extract structured medical test results from the provided medical report text.

IMPORTANT:
Extract ONLY information that is explicitly present in the input.
Do not invent, assume, calculate, or add medical test results.

RULES:

1. Extract every medical test explicitly present in the input.

2. Do NOT add tests that are not present in the input.

3. Correct only obvious OCR spelling errors in test names.
   Example:
   "Hemoglobn" -> "Hemoglobin"
   "Plate1et" -> "Platelet"
   "Hgh" -> "High"

4. NEVER change numerical values.
   Preserve the actual value from the input.

5. Extract the unit only if it is explicitly present.
   If no unit is present, return:
   "unit": null

6. Extract the status ONLY if it is explicitly stated in the report.
   Valid statuses are:
   "low"
   "normal"
   "high"

7. Convert explicitly stated status to lowercase.
   Examples:
   "Low" -> "low"
   "Normal" -> "normal"
   "High" -> "high"
   "Hgh" -> "high" if it is clearly an OCR error for High

8. NEVER infer status from medical knowledge or from the numerical value alone.

9. If the report does not explicitly state a status, return:
   "status": null

10. Extract a reference range ONLY if it is explicitly present in the input.

11. NEVER invent or assume a reference range.

12. If no reference range is present, return:
   "ref_range": null

13. If a reference range is present, ALWAYS return it as an object, NOT as a string.

14. The ref_range object MUST contain exactly:
   "low": number
   "high": number

15. For example:
   "Reference Range: 12.0-15.0 g/dL"

   MUST become:

   "ref_range": {
     "low": 12.0,
     "high": 15.0
   }

16. NEVER return:
   "ref_range": "12.0-15.0"

17. NEVER return:
   "ref_range": {
     "low": null,
     "high": null
   }

18. If the reference range is missing, return null.

19. Do not add medical tests based on common knowledge.
   For example, if only Hemoglobin is present, do not add WBC, RBC, Platelets, MCV, etc.

20. Do not add values that are not present in the input.

21. Do not change units.

22. Preserve decimal values accurately.

23. Numbers containing commas must be converted to numeric values.
   Example:
   "11,200" -> 11200
   "250,000" -> 250000

24. If the input contains no recognizable medical tests, return an empty tests_raw array.

25. confidence must be a number between 0 and 1 representing confidence in the extraction.

26. Return ONLY valid JSON.
   Do not include markdown.
   Do not include explanations outside the JSON.

OUTPUT FORMAT:

{
  "tests_raw": [
    {
      "name": "Hemoglobin",
      "value": 10.2,
      "unit": "g/dL",
      "status": "low",
      "ref_range": null
    }
  ],
  "confidence": 0.95
}

EXAMPLE 1:

Input:
Hemoglobin 11.4 g/dL (Low), WBC 9800 /uL (Normal)

Output:
{
  "tests_raw": [
    {
      "name": "Hemoglobin",
      "value": 11.4,
      "unit": "g/dL",
      "status": "low",
      "ref_range": null
    },
    {
      "name": "WBC",
      "value": 9800,
      "unit": "/uL",
      "status": "normal",
      "ref_range": null
    }
  ],
  "confidence": 0.95
}

EXAMPLE 2:

Input:
Hemoglobin 10.2 g/dL, Reference Range: 12.0-15.0 g/dL

Output:
{
  "tests_raw": [
    {
      "name": "Hemoglobin",
      "value": 10.2,
      "unit": "g/dL",
      "status": null,
      "ref_range": {
        "low": 12.0,
        "high": 15.0
      }
    }
  ],
  "confidence": 0.95
}

EXAMPLE 3:

Input:
Hemoglobn 10.2 g/dL (Low), WBC 11,200 /uL (Hgh)

Output:
{
  "tests_raw": [
    {
      "name": "Hemoglobin",
      "value": 10.2,
      "unit": "g/dL",
      "status": "low",
      "ref_range": null
    },
    {
      "name": "WBC",
      "value": 11200,
      "unit": "/uL",
      "status": "high",
      "ref_range": null
    }
  ],
  "confidence": 0.85
}

EXAMPLE 4:

Input:
Ferritin 35 ng/mL, CRP 4.2 mg/L

Output:
{
  "tests_raw": [
    {
      "name": "Ferritin",
      "value": 35,
      "unit": "ng/mL",
      "status": null,
      "ref_range": null
    },
    {
      "name": "CRP",
      "value": 4.2,
      "unit": "mg/L",
      "status": null,
      "ref_range": null
    }
  ],
  "confidence": 0.95
}

MEDICAL REPORT INPUT:
${reportText}
`,
    config: {
      responseMimeType: "application/json"
    }
  });

  const output = response.text;

  if (!output) {
    throw new Error("No output received from Gemini");
  }

  const parsedOutput = JSON.parse(output);

  return extractionSchema.parse(parsedOutput);
};