# AI-Powered Medical Report Simplifier

> **OCR → AI Extraction → Validation → Normalization → Guardrail → Simple Explanation**

A backend API that accepts **typed medical reports or scanned report images**, extracts test results into structured JSON, validates the AI output, checks that results are actually present in the source, and generates short patient-friendly explanations.

---

## 🚀 What the Project Does

```text
Typed Report ───────────────┐
                            │
                            ▼
                      Test Extraction
                            │
Image → OCR ────────────────┘
                            │
                            ▼
                      Zod Validation
                            │
                            ▼
                       Normalization
                            │
                            ▼
                    Hallucination Check
                            │
                            ▼
                    Patient Explanation
                            │
                            ▼
                       Final JSON
```

The important part is that **Gemini is not trusted blindly**. AI is used for language understanding, while validation, normalization, and source-grounding are handled by backend code.

---

# 🛠 Tech Stack

| Technology | Used For |
|---|---|
| **Node.js** | Backend runtime |
| **Express.js** | REST API |
| **Gemini API** | Medical test extraction + explanations |
| **Tesseract.js** | OCR for report images |
| **Multer** | Image upload handling |
| **Zod** | Runtime validation of AI/API data |
| **dotenv** | API key and environment configuration |
| **CORS** | Cross-origin API support |
| **Nodemon** | Development server auto-restart |
| **Postman** | API testing |

---

# 📁 Project Structure

```text
medical-report-simplifier/
│
├── src/
│   ├── controllers/
│   │   └── reportController.js
│   │
│   ├── routes/
│   │   └── reportRoutes.js
│   │
│   ├── services/
│   │   ├── ocrService.js
│   │   ├── extractionService.js
│   │   ├── normalizationService.js
│   │   ├── explanationService.js
│   │   └── guardrailService.js
│   │
│   ├── schemas/
│   │   └── reportSchema.js
│   │
│   ├── utils/
│   │   └── errors.js
│   │
│   ├── app.js
│   └── server.js
│
├── uploads/
├── samples/
├── .env
├── .gitignore
├── package.json
└── README.md
```

---

# 🧩 What Each File Does

## `src/server.js`

**Purpose:** Starts the backend server.

It:

1. Loads `.env`
2. Imports the Express app
3. Reads `PORT`
4. Starts `app.listen()`

```text
server.js
   ↓
app.js
   ↓
Express server starts
```

---

## `src/app.js`

**Purpose:** Creates the Express application.

It:

- Creates the Express app
- Enables CORS
- Enables JSON parsing
- Registers `/api/report` routes
- Provides `/api/health`
- Handles application-level errors

The important route mounting is:

```js
app.use("/api/report", reportRoutes);
```

So a route defined as:

```js
router.post("/text", ...)
```

becomes:

```text
POST /api/report/text
```

---

## `src/routes/reportRoutes.js`

**Purpose:** Defines API endpoints and image-upload rules.

Routes:

```text
POST /api/report/text
POST /api/report/image
```

Multer is configured here.

Current rules:

```text
Allowed: PNG, JPEG
Maximum: 5 MB
```

The route layer mainly answers:

> **"Which controller should handle this request?"**

---

## `src/controllers/reportController.js`

**Purpose:** Orchestrates the complete processing pipeline.

This is the layer that connects all services.

For text:

```text
Request
 ↓
Gemini Extraction
 ↓
Normalization
 ↓
Guardrail
 ↓
Explanation
 ↓
Final Zod Validation
 ↓
Response
```

For image:

```text
Request
 ↓
OCR
 ↓
Gemini Extraction
 ↓
Normalization
 ↓
Guardrail
 ↓
Explanation
 ↓
Final Zod Validation
 ↓
Response
```

The controller does not contain the actual OCR or AI logic. It coordinates the services.

---

# ⚙️ Services

## `src/services/ocrService.js`

**Purpose:** Converts an image into text.

Technology:

```text
Tesseract.js
```

Flow:

```text
medical-report.png
       ↓
Tesseract
       ↓
"Hemoglobn 10.2 g/dL (Low)"
```

It also performs basic cleanup of OCR output.

Tesseract's job ends here.

It does **not** decide what the test means.

---

## `src/services/extractionService.js`

**Purpose:** Converts report text into structured test objects.

Technology:

```text
Gemini API
```

Example input:

```text
Hemoglobn 10.2 g/dL (Low)
WBC 11,200 /uL (Hgh)
```

Gemini is instructed to return:

```json
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
```

The prompt allows correction of obvious OCR errors such as:

```text
Hemoglobn → Hemoglobin
Hgh → High
```

but tells Gemini:

```text
Never change numerical values.
Never add tests.
Never invent reference ranges.
```

---

## `src/services/normalizationService.js`

**Purpose:** Makes extracted data consistent before it is used.

Examples:

```text
"  Hemoglobin  " → "Hemoglobin"

"11,200" → 11200
```

It also handles missing fields:

```text
missing unit → null
missing reference range → null
missing status → unknown
```

If an explicit reference range is available, the backend can calculate status deterministically.

Example:

```text
Value = 11.2
Range = 12.0 - 15.0

11.2 < 12.0
       ↓
status = low
```

This keeps simple numeric logic outside the LLM.

---

## `src/services/guardrailService.js`

**Purpose:** Checks whether the AI output is actually supported by the original report.

This is the main anti-hallucination layer.

For every extracted test, it checks:

### 1. Test name

Does the test name appear in the source?

Minor OCR differences are handled using fuzzy matching.

```text
Hemoglobn
   ↓
Hemoglobin
```

### 2. Value

Does the extracted number appear in the source?

Example:

```text
Source:
Hemoglobin 10.2 g/dL

AI:
Hemoglobin 12.2 g/dL
```

The guardrail rejects it because:

```text
12.2 ≠ 10.2
```

### Result

If Gemini invents:

```text
WBC 11200
```

when WBC was never in the input:

```json
{
  "status": "unprocessed",
  "reason": "Hallucinated test not present in input: WBC"
}
```

---

## `src/services/explanationService.js`

**Purpose:** Turns validated test results into simple explanations.

It receives the **validated tests**, rather than blindly processing the original report.

Example:

```json
{
  "tests": [
    {
      "name": "Hemoglobin",
      "value": 10.2,
      "unit": "g/dL",
      "status": "low",
      "ref_range": null
    }
  ]
}
```

Gemini produces something like:

```json
{
  "summary": "Hemoglobin is below the reported level.",
  "explanations": [
    "Low hemoglobin may be associated with anemia."
  ]
}
```

The explanation prompt also tells Gemini:

```text
Do not add tests.
Do not change values.
Do not make a diagnosis.
Use simple language.
```

---

# 🔒 `src/schemas/reportSchema.js`

**Purpose:** Defines the structure the AI and API are allowed to return.

Zod validates objects at runtime.

For example:

```js
status: z.enum([
  "low",
  "normal",
  "high",
  "unknown"
])
```

This prevents unexpected values such as:

```text
status: "maybe"
```

from entering the final API response.

There are separate schemas for:

```text
AI extraction
       ↓
Final normalized response
```

---

# 🧯 `src/utils/errors.js`

**Purpose:** Keeps reusable error-related helpers/custom errors separate from controllers.

This avoids putting every error-handling utility directly inside route/controller files.

---

# 📂 `uploads/`

Temporary storage for uploaded report images.

The image is processed by OCR and then removed after processing.

This prevents the server from unnecessarily accumulating uploaded reports.

---

# 📂 `samples/`

Contains sample inputs used during development/testing.

For example:

```text
sample-report.txt
sample-report.png
```

---

# 🔐 `.env`

Stores environment-specific values:

```env
GEMINI_API_KEY=your_api_key
PORT=3000
```

The API key is never hardcoded into source code.

---

# 🚫 `.gitignore`

Recommended:

```gitignore
node_modules/
.env
uploads/
```

This prevents dependencies, secrets, and temporary uploaded files from being pushed to GitHub.

---

# 📦 `package.json`

Contains:

- Project metadata
- Dependencies
- npm scripts
- Module configuration

Example:

```bash
npm run dev
```

starts the development server using Nodemon.

---

# 🔄 Complete Request Flow

## Text Request

Client sends:

```http
POST /api/report/text
```

with:

```json
{
  "text": "Hemoglobin 10.2 g/dL (Low), WBC 11200 /uL (High)"
}
```

### Step-by-step

```text
1. Express receives request
             ↓
2. Controller reads req.body.text
             ↓
3. Gemini extracts tests
             ↓
4. Zod validates extraction
             ↓
5. Normalization cleans structure
             ↓
6. Guardrail checks source grounding
             ↓
7. Gemini explains validated tests
             ↓
8. Final Zod validation
             ↓
9. JSON response
```

---

# 🖼️ Image Request Flow

Client sends:

```http
POST /api/report/image
```

using:

```text
multipart/form-data
file = report.png
```

### Step-by-step

```text
1. Express receives image
             ↓
2. Multer checks file type + size
             ↓
3. Image saved temporarily
             ↓
4. Tesseract performs OCR
             ↓
5. OCR text sent to extraction service
             ↓
6. Gemini extracts structured tests
             ↓
7. Zod validates AI response
             ↓
8. Normalization
             ↓
9. Guardrail checks source grounding
             ↓
10. Gemini generates explanation
             ↓
11. Final Zod validation
             ↓
12. Temporary image deleted
             ↓
13. JSON response
```

---

# 🧠 Why the Pipeline Is Split Into Multiple Stages

Instead of doing:

```text
Image → LLM → Final Answer
```

the backend uses:

```text
Image
 ↓
OCR
 ↓
Extraction
 ↓
Validation
 ↓
Normalization
 ↓
Grounding
 ↓
Explanation
 ↓
Final Validation
```

Each stage has one clear responsibility.

This makes it easier to:

- Debug failures
- Test individual components
- Replace a service
- Prevent hallucinated information
- Keep API responses predictable

---

# 📡 API Endpoints

## Health Check

```http
GET /api/health
```

Response:

```json
{
  "status": "ok",
  "service": "medical-report-simplifier"
}
```

---

## Text Report

```http
POST /api/report/text
```

Body:

```json
{
  "text": "I went to the hospital because I was feeling weak. My hemoglobin was 10.2 g/dL and it was marked as low. My WBC count was 11,200 /uL and it was marked as high."
}
```

---

## Image Report

```http
POST /api/report/image
```

Body:

```text
multipart/form-data
```

Field:

```text
file = medical-report.png
```

Supported:

```text
PNG
JPEG
```

Maximum:

```text
5 MB
```

---

# 📤 Example Final Response

```json
{
  "tests": [
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
  "summary": "Low hemoglobin and high white blood cell count.",
  "explanations": [
    "Low hemoglobin may relate to anemia.",
    "High WBC can occur with infections."
  ],
  "status": "ok"
}
```

---

# ❌ Error Handling

The API uses different responses depending on where processing fails.

### Missing text

```json
{
  "status": "unprocessed",
  "reason": "Report text is required"
}
```

### No medical tests

```json
{
  "status": "unprocessed",
  "reason": "No recognizable medical tests found"
}
```

### Hallucinated test

```json
{
  "status": "unprocessed",
  "reason": "Hallucinated test not present in input: WBC"
}
```

### Invalid image

```json
{
  "status": "unprocessed",
  "reason": "Only PNG and JPEG images are allowed"
}
```

### Image too large

```json
{
  "status": "unprocessed",
  "reason": "Image size must be less than 5MB"
}
```

### AI service failure

```json
{
  "status": "error",
  "message": "AI service is temporarily unavailable"
}
```

---

# 🧪 Testing

The API can be tested using Postman.

Recommended test cases:

```text
✓ Normal typed report
✓ Natural paragraph
✓ OCR-style spelling mistakes
✓ Reference ranges
✓ Image report
✓ Empty text
✓ Non-medical text
✓ Garbage input
✓ Hallucinated test
✓ Incorrect numerical value
✓ Invalid image type
✓ Image > 5 MB
✓ Missing image
```

---

# 🎯 Engineering Highlights

### Modular backend

```text
Routes
  ↓
Controllers
  ↓
Services
  ↓
Schemas / Guardrails
```

Each layer has a focused responsibility.

### AI + deterministic code

AI handles:

```text
Natural language understanding
OCR-error interpretation
Patient-friendly explanation
```

Backend code handles:

```text
File validation
Schema validation
Normalization
Numeric checks
Grounding
Error handling
```

### AI output is validated

The project does not directly trust the LLM response.

```text
Gemini
 ↓
JSON
 ↓
Zod
 ↓
Normalization
 ↓
Guardrail
```

### Source-grounded results

The backend checks both:

```text
Test name
+
Numerical value
```

against the original report before generating the final response.

---

# ⚠️ Limitations

- OCR quality depends on image quality.
- Complex medical tables may need specialized document-layout processing.
- Handwritten reports are not the primary target.
- Reference ranges vary between laboratories.
- AI explanations are informational and are not a medical diagnosis.
- The current version does not maintain patient history.

---

# 🔮 Future Improvements

- PDF report support
- Better image preprocessing
- Table-aware OCR/document parsing
- More robust test-name normalization
- Multi-language OCR
- Confidence-based human review
- Cloud deployment
- Authentication
- Persistent report history where appropriate

---

# ▶️ Run Locally

```bash
npm install
npm run dev
```

Server:

```text
http://localhost:3000
```

Health check:

```text
http://localhost:3000/api/health
```

---

# 📌 Project Status

```text
[✓] Express REST API
[✓] Typed report processing
[✓] Image upload
[✓] OCR
[✓] Gemini extraction
[✓] OCR spelling correction
[✓] Zod validation
[✓] Test normalization
[✓] Hallucination guardrail
[✓] Patient-friendly explanation
[✓] Error handling
[✓] Postman testing
[ ] Deployment
[ ] Public demo
```

---

## One-Line Project Summary

**An AI-powered Node.js backend that converts typed or scanned medical reports into validated, source-grounded test results and patient-friendly explanations using OCR, Gemini, Zod, and deterministic guardrails.**
