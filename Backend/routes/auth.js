const express = require("express");
const router = express.Router();
const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const OWNER_CREDENTIALS = JSON.parse(process.env.OWNER_CREDENTIALS);

// ✅ REGISTER new user
router.post("/register", async (req, res) => {
  try {
    const { username, email, password, age, phone } = req.body;

    // Check existing user
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create and save new user
    const newUser = new User({
      username,
      email,
      password: hashedPassword,
      age,
      phone,
      role: "user",
    });
    await newUser.save();

    res.json({ message: "Registration successful" });
  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ message: "Server error" });
  }
});




router.post("/login", async (req, res) => {
  const { email, username, password } = req.body;
  const userEmail = email || username;

  try {
    // 1️⃣ Owner check
    const owner = OWNER_CREDENTIALS.find(
      (o) => o.email === userEmail && o.password === password
    );

    if (owner) {
      // Check if owner exists in DB
      let ownerUser = await User.findOne({ email: userEmail });
      if (!ownerUser) {
        ownerUser = new User({
          username: owner.name.toLowerCase().replace(/\s+/g, ""),
          email: owner.email,
          password: await bcrypt.hash(owner.password, 10),
          role: "owner",
          age: owner.age,
          phone: owner.phone,
        });
        await ownerUser.save();
      }

      const token = jwt.sign(
        {
          _id: ownerUser._id,
          email: ownerUser.email,
          role: "owner",
          isOwner: true,
          name: ownerUser.username,
          age: ownerUser.age,
          phone: ownerUser.phone,
        },
        process.env.JWT_SECRET
      );

      return res.json({
        token,
        user: {
          _id: ownerUser._id,
          username: ownerUser.username,
          email: ownerUser.email,
          role: "owner",
          age: ownerUser.age,
          phone: ownerUser.phone,
        },
      });
    }

    // 2️⃣ Normal user login
    const user = await User.findOne({
      $or: [{ email: userEmail }, { username: userEmail }],
    });
    if (!user) return res.status(404).json({ message: "User not found" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: "Invalid password" });

    const token = jwt.sign(
      {
        _id: user._id,
        email: user.email,
        role: "user",
        username: user.username,
        age: user.age,
        phone: user.phone,
      },
      process.env.JWT_SECRET
    );

    res.json({
      token,
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        role: "user",
        age: user.age,
        phone: user.phone,
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
