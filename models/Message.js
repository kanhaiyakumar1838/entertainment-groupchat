// models/Message.js
const mongoose = require("mongoose");

const ReactionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  type: { type: String, enum: ["like", "heart"], required: true },
});

const MessageSchema = new mongoose.Schema(
  {
    group: { type: mongoose.Schema.Types.ObjectId, ref: "Group", required: true },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    text: { type: String },
    media: {
      url: String,
      mimetype: String,
      external: { type: Boolean, default: false },
    },
    youtube: {
      videoId: String,
      title: String,
      thumbnail: String,
    },
    audio: {
      url: String,
      mimetype: String,
      duration: Number, // optional, for frontend display
    },
    reactions: [ReactionSchema],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Message", MessageSchema);
