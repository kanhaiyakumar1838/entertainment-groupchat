const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs-extra");

// Ensure uploads directory and subfolders exist
const BASE_UPLOAD_DIR = path.join(__dirname, "..", "uploads");
const IMAGE_DIR = path.join(BASE_UPLOAD_DIR, "images");
const VIDEO_DIR = path.join(BASE_UPLOAD_DIR, "videos");
const AUDIO_DIR = path.join(BASE_UPLOAD_DIR, "audios");

fs.ensureDirSync(IMAGE_DIR);
fs.ensureDirSync(VIDEO_DIR);
fs.ensureDirSync(AUDIO_DIR);

// Configure multer storage dynamically based on file type
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, IMAGE_DIR);
    else if (file.mimetype.startsWith("video/")) cb(null, VIDEO_DIR);
    else if (file.mimetype.startsWith("audio/")) cb(null, AUDIO_DIR);
    else cb(new Error("Invalid file type"));
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const name = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, name);
  },
});

// File type and size restrictions
const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max
  fileFilter: (req, file, cb) => {
    if (
      file.mimetype.startsWith("image/") ||
      file.mimetype.startsWith("video/") ||
      file.mimetype.startsWith("audio/")
    ) {
      cb(null, true);
    } else {
      cb(new Error("Only image, video, and audio files are allowed"));
    }
  },
});

// ✅ POST /api/upload — handles single file
router.post("/", upload.single("file"), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    // Determine correct folder for URL
    let subdir = "misc";
    if (req.file.mimetype.startsWith("image/")) subdir = "images";
    else if (req.file.mimetype.startsWith("video/")) subdir = "videos";
    else if (req.file.mimetype.startsWith("audio/")) subdir = "audios";

    const url = `/uploads/${subdir}/${req.file.filename}`;

    res.json({
      url,
      mimetype: req.file.mimetype,
    });
  } catch (err) {
    console.error("Upload error:", err);
    res.status(500).json({ message: "Upload failed" });
  }
});

module.exports = router;
