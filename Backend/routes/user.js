// routes/user.js
const express = require("express");
const router = express.Router();
const User = require("../models/User");
const authMiddleware = require("../middleware/auth"); // your auth middleware

// Get current user profile
router.get("/me", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// Update profile picture
router.post("/me/profile-pic", authMiddleware, async (req, res) => {
  try {
    const { profilePic } = req.body; // URL or base64
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { profilePic },
      { new: true }
    ).select("-password");
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
