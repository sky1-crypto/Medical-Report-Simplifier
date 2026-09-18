import { extractTests } from "../services/extractionService.js";
import { normalizeTest } from "../services/normalizationService.js";
import { validateTestsAgainstInput } from "../services/guardrailService.js";
import { explainTests } from "../services/explanationService.js";
import { extractTextFromImage } from "../services/ocrService.js";
import fs from "fs";
import { finalReportSchema } from "../schemas/reportSchema.js";


const processTextReport = async (req, res) => {
    try {
        const { text } = req.body;

        if (!text || !text.trim()) {
            return res.status(400).json({
                status: "unprocessed",
                reason: "Report text is required"
            });
        }

        const result = await extractTests(text);
        // console.log(
        //     "GEMINI EXTRACTION:",
        //     JSON.stringify(result, null, 2)
        // );


        if (
            !result ||
            !Array.isArray(result.tests_raw) ||
            result.tests_raw.length === 0
        ) {
            return res.status(422).json({
                status: "unprocessed",
                reason: "No recognizable medical tests found"
            });
        }


        const tests = result.tests_raw.map(normalizeTest);
        const guardrailResult = validateTestsAgainstInput(text, tests);

        if (!guardrailResult.valid) {
            return res.status(422).json({
                status: "unprocessed",
                reason: guardrailResult.reason
            });
        }

        const explanation = await explainTests(tests);

        const finalReport = {
            tests,
            summary: explanation.summary,
            explanations: explanation.explanations,
            status: "ok"
        };

        const validatedReport = finalReportSchema.parse(finalReport);

        res.json(validatedReport);



    } catch (error) {
        console.error("TEXT REPORT ERROR:", error);

        if (error.name === "ZodError") {
            return res.status(500).json({
                status: "error",
                message: "AI returned an invalid response format"
            });
        }

        if (
            error.message?.includes("API") ||
            error.message?.includes("Gemini") ||
            error.message?.includes("quota") ||
            error.message?.includes("429")
        ) {
            return res.status(503).json({
                status: "error",
                message: "AI service is temporarily unavailable"
            });
        }

        return res.status(500).json({
            status: "error",
            message: "Failed to process medical report"
        });
    }
};

const processImageReport = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                status: "unprocessed",
                reason: "Report image is required"
            });
        }

        const extractedText = await extractTextFromImage(req.file.path);

        if (!extractedText || !extractedText.trim()) {
            return res.status(422).json({
                status: "unprocessed",
                reason: "No readable text found in image"
            });
        }

        const extractionResult = await extractTests(extractedText);

        if (
            !extractionResult ||
            !Array.isArray(extractionResult.tests_raw) ||
            extractionResult.tests_raw.length === 0
        ) {
            return res.status(422).json({
                status: "unprocessed",
                reason: "No recognizable medical tests found"
            });
        }

        const tests = extractionResult.tests_raw.map(normalizeTest);

        const guardrailResult = validateTestsAgainstInput(
            extractedText,
            tests
        );

        if (!guardrailResult.valid) {
            return res.status(422).json({
                status: "unprocessed",
                reason: guardrailResult.reason
            });
        }

        const explanation = await explainTests(tests);

        const finalReport = {
            tests,
            summary: explanation.summary,
            explanations: explanation.explanations,
            status: "ok"
        };

        const validatedReport = finalReportSchema.parse(finalReport);

        fs.unlinkSync(req.file.path);

        res.json(validatedReport);
    } catch (error) {
        console.error("IMAGE ERROR:", error);

        if (req.file?.path && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }

        if (error.name === "ZodError") {
            return res.status(500).json({
                status: "error",
                message: "AI returned an invalid response format"
            });
        }

        if (
            error.message?.includes("API") ||
            error.message?.includes("Gemini") ||
            error.message?.includes("quota") ||
            error.message?.includes("429")
        ) {
            return res.status(503).json({
                status: "error",
                message: "AI service is temporarily unavailable"
            });
        }

        return res.status(500).json({
            status: "error",
            message: "Failed to process medical report image"
        });
    }
};

export {
    processTextReport,
    processImageReport
};