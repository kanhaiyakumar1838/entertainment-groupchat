const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

// Import routes
const authRoutes = require("./routes/auth");
const groupRoutes = require("./routes/groups");
const messageRoutes = require("./routes/messages");
const uploadRoutes = require("./routes/upload");

const app = express();

// ✅ CORS setup
app.use(cors({
  origin: ["https://rainbow-chat.onrender.com,http://localhost:3000", "http://localhost:3001"],
  //origin: "*",
  credentials: true,
}));

app.use(express.json());

// ✅ Serve static uploads folder
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ✅ Routes
app.use("/api/auth", authRoutes);
app.use("/api/groups", groupRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/upload", uploadRoutes); // <— make sure this comes AFTER express.json()

app.get("/", (req, res) => {
  res.send("✅ Backend is running successfully on Render!");
});


app.get("/api/test", (req, res) => {
  res.json({ message: "✅ API is running successfully on Render!" });
});

// ✅ MongoDB connection
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log("✅ MongoDB connected");
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, "0.0.0.0", () => console.log(`🚀 Server running on port ${PORT}`));

  })
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err);
  });
