import express from "express";
import multer from "multer";
import {
  processTextReport,
  processImageReport
} from "../controllers/reportController.js";

const router = express.Router();

const upload = multer({
  dest: "uploads/",
  limits: {
    fileSize: 5 * 1024 * 1024
  },
  fileFilter: (req, file, cb) => {
    if (
      file.mimetype === "image/png" ||
      file.mimetype === "image/jpeg"
    ) {
      cb(null, true);
    } else {
      cb(new Error("Only PNG and JPEG images are allowed"));
    }
  }
});

router.post("/text", processTextReport);
router.post("/image", upload.single("file"), processImageReport);

export default router;