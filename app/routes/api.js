import express from "express";
import multer from "multer";
import { matchJobs } from "../controllers/job.controller.js";

const router = express.Router();

const upload = multer({
  dest: "uploads/",
  limits: {
    fileSize:
    5 * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype !== "application/pdf") {
      return cb(new Error("Only PDF resumes are allowed"));
    }
    cb(null, true);
  },
});

router.post("/api/jobs/match", upload.single("resume"), matchJobs);

export default router;