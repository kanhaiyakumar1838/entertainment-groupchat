const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const Message = require("../models/Message");
const Group = require("../models/Group");

// ✅ Get all messages in a group
router.get("/:groupId", auth, async (req, res) => {
  try {
    const messages = await Message.find({ group: req.params.groupId })
      .populate("sender", "username email")
      .sort({ createdAt: 1 })
      .exec();

    res.json(messages);
  } catch (err) {
    console.error("Error fetching messages:", err);
    res.status(500).json({ error: "Server error" });
  }
});


//  ✅ POST /api/messages/:messageId/react
router.post("/:messageId/react", auth, async (req, res) => {
  try {
    const { type } = req.body; // "like" or "heart"
    const message = await Message.findById(req.params.messageId);
    if (!message) return res.status(404).json({ error: "Message not found" });

    const existing = message.reactions.find(
      (r) => r.user.toString() === req.user._id.toString() && r.type === type
    );

    if (existing) {
      // Undo reaction
      message.reactions = message.reactions.filter(
        (r) => !(r.user.toString() === req.user._id.toString() && r.type === type)
      );
    } else {
      // Add reaction
      message.reactions.push({ user: req.user._id, type });
    }

    await message.save();
    await message.populate("reactions.user", "username");

    // Emit via socket.io
    const io = req.app.get("io");
    if (io) io.to(String(message.group)).emit("reactionUpdated", message);

    res.json(message);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});


// ✅ Send a message (image, video, audio, youtube, or text)
router.post("/:groupId", auth, async (req, res) => {
  try {
    const { text, media, youtube, audio } = req.body;
    const groupId = req.params.groupId;
    const senderId = req.user?._id;

    console.log("🟢 Incoming message:", { groupId, senderId, text, media, audio, youtube });

    if (!groupId || !senderId) {
      console.error("❌ Missing groupId or senderId");
      return res.status(400).json({ error: "Missing groupId or senderId" });
    }

    // 🔍 Fetch group safely
    const group = await Group.findById(groupId);
    if (!group) {
      console.error("❌ Group not found:", groupId);
      return res.status(404).json({ error: "Group not found" });
    }

    // ✅ Ensure `group.members` exists and is array
    if (!Array.isArray(group.members)) {
      console.error("❌ Group members field invalid:", group);
      return res.status(500).json({ error: "Group members data corrupted" });
    }

    // ✅ Verify user is member or owner
    const isMember =
      req.user.isOwner ||
      group.members.some((m) => m?.toString() === senderId.toString());

    if (!isMember) {
      console.error("❌ User not in group:", senderId);
      return res.status(403).json({ error: "You are not a member of this group" });
    }

    // ✅ Create new message document
    const message = new Message({
      group: group._id,
      sender: senderId,
      text: text || "",
      media: media || null, // { url, mimetype }
      youtube: youtube || null, // { videoId, title, thumbnail }
      audio: audio || null, // { url, mimetype }
    });

    await message.save();
    await message.populate("sender", "username email");

    // ✅ Emit real-time message event
    const io = req.app.get("io");
    if (io) io.to(String(group._id)).emit("newMessage", message);

    console.log("✅ Message saved:", message._id);
    res.json(message);
  } catch (err) {
    console.error("❌ Error sending message:", err);
    res.status(500).json({ error: "Server error" });
  }
});


// ✅ Delete a message (only group admin or owner)
router.delete("/:messageId", auth, async (req, res) => {
  try {
    const message = await Message.findById(req.params.messageId);
    if (!message) return res.status(404).json({ error: "Message not found" });

    const group = await Group.findById(message.group);
    if (!group) return res.status(404).json({ error: "Group not found" });

    // Only owner or group admin can delete
    if (!req.user.isOwner && String(group.admin) !== String(req.user._id))
      return res.status(403).json({ error: "Not authorized to delete this message" });

    await message.deleteOne();

    // Notify members
    const io = req.app.get("io");
    if (io) io.to(String(group._id)).emit("messageDeleted", { messageId: message._id });

    res.json({ success: true });
  } catch (err) {
    console.error("Error deleting message:", err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
