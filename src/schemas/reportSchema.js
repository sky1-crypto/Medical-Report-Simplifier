import { z } from "zod";

const extractedTestSchema = z.object({
  name: z.string().min(1),
  value: z.number(),
  unit: z.string().nullable().optional(),
  status:z.enum(["low", "normal", "high"]).nullable().optional(),
  ref_range: z.object({
    low: z.number(),
    high: z.number()
  }).nullable().optional()
});

export const extractionSchema = z.object({
  tests_raw: z.array(extractedTestSchema),
  confidence: z.number().min(0).max(1)
});

const normalizedTestSchema = z.object({
  name: z.string(),
  value: z.number(),
  unit: z.string().nullable(),
  status: z.enum([
    "low",
    "normal",
    "high",
    "unknown"
  ]),
  ref_range: z.object({
    low: z.number(),
    high: z.number()
  }).nullable()
});

export const finalReportSchema = z.object({
  status: z.literal("ok"),
  tests: z.array(normalizedTestSchema),
  summary: z.string(),
  explanations: z.array(z.string())
});