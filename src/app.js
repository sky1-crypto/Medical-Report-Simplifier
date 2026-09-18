import express from "express";
import cors from "cors";
import reportRoutes from "./routes/reportRoutes.js";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    service: "medical-report-simplifier"
  });
});

app.use("/api/report", reportRoutes);
app.use((err, req, res, next) => {
  console.error("ERROR:", err.message);

  if (err.message === "Only PNG and JPEG images are allowed") {
    return res.status(400).json({
      status: "unprocessed",
      reason: err.message
    });
  }

  if (err.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({
      status: "unprocessed",
      reason: "Image size must be less than 5MB"
    });
  }

  res.status(500).json({
    status: "error",
    message: "Something went wrong while processing the report"
  });
});

export default app;