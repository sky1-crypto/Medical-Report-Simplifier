import Tesseract from "tesseract.js";

export const extractTextFromImage = async (imagePath) => {
  const result = await Tesseract.recognize(
    imagePath,
    "eng",
    {
      logger: (info) => {
        if (info.status === "recognizing text") {
          console.log(
            `OCR Progress: ${Math.round(info.progress * 100)}%`
          );
        }
      }
    }
  );

  const text = result.data.text
    .replace(/\r/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return text;
};