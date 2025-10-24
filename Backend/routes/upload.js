const express = require("express");
const router = express.Router();
const multer = require("multer");
const { v2: cloudinary } = require("cloudinary");
const fs = require("fs-extra");
require("dotenv").config();

// ✅ Cloudinary config
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ✅ Use multer to handle file uploads (in memory)
const upload = multer({ dest: "temp/" });

// ✅ Upload route
router.post("/", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });

    // Upload file to Cloudinary
    const result = await cloudinary.uploader.upload(req.file.path, {
      resource_type: "auto", // auto-detects image/video/audio
      folder: "groupchat_uploads",
    });

    // Remove temp file after upload
    await fs.remove(req.file.path);

    res.json({
      url: result.secure_url,
      mimetype: req.file.mimetype,
    });
  } catch (err) {
    console.error("Cloudinary upload error:", err);
    res.status(500).json({ message: "Upload failed", error: err.message });
  }
});

module.exports = router;
