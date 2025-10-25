const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
const http = require("http");
const { Server } = require("socket.io");
require("dotenv").config();

// Import routes
const authRoutes = require("./routes/auth");
const groupRoutes = require("./routes/groups");
const messageRoutes = require("./routes/messages");
const uploadRoutes = require("./routes/upload");

// Initialize express
const app = express();

// ✅ CORS setup
app.use(
  cors({
    origin: [
      "https://rainbow-chat.onrender.com",  // frontend
      "http://localhost:3000"               // for local dev
    ],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);


app.use(express.json());

// ✅ Serve static uploads folder
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ✅ API routes
app.use("/api/auth", authRoutes);
app.use("/api/groups", groupRoutes);
app.use("/messages", messageRoutes);
app.use("/upload", uploadRoutes);

app.get("/", (req, res) => {
  res.send("✅ Backend is running successfully on Render!");
});

app.get("/api/test", (req, res) => {
  res.json({ message: "✅ API is running successfully on Render!" });
});

// ✅ Create HTTP server for Socket.IO
const server = http.createServer(app);

// ✅ Initialize Socket.IO
const io = new Server(server, {
  cors: {
    origin: "*", // You can restrict to frontend URL if you want
    methods: ["GET", "POST"],
  },
});

// ✅ Socket.IO event handling
io.on("connection", (socket) => {
  console.log("🟢 New user connected:", socket.id);

  // Join group (room)
  socket.on("joinGroup", (groupId) => {
    socket.join(groupId);
    console.log(`📦 User ${socket.id} joined group: ${groupId}`);
  });

  // When a new message is created
  socket.on("newMessage", (groupId, message) => {
    io.to(groupId).emit("messageReceived", message);
    console.log(`📩 Message sent to group ${groupId}`);
  });

  socket.on("disconnect", () => {
    console.log("🔴 User disconnected:", socket.id);
  });
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
    server.listen(PORT, "0.0.0.0", () =>
      console.log(`🚀 Server running on port ${PORT}`)
    );
  })
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err);
  });

// ✅ Export io (so routes like messages.js can emit events)
module.exports = { io };
