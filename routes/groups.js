const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const Group = require("../models/Group");
const Message = require("../models/Message");


// ✅ Get all groups
router.get("/", auth, async (req, res) => {
  try {
    const groups = await Group.find().populate("admin", "username email");
    res.json(groups);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// ✅ Delete group — ONLY OWNER (global delete)
router.delete("/:id", auth, async (req, res) => {
  try {
    console.log("Creating group, req.user:", req.user);

    if (!req.user.isOwner)
      return res.status(403).json({ error: "Only owners can delete groups" });

    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ error: "Group not found" });

    await Message.deleteMany({ group: group._id });
    await group.deleteOne();

    // Notify via socket
    const io = req.app.get("io");
    if (io) io.to(String(group._id)).emit("groupDeleted", { groupId: group._id });

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// ✅ Join group
router.post("/:id/join", auth, async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ error: "Group not found" });

    if (group.members.some((m) => m.toString() === req.user._id.toString()))
      return res.json({ success: true, message: "Already member" });

    group.members.push(req.user._id);
    await group.save();

    // Notify members
    const io = req.app.get("io");
    if (io)
      io.to(String(group._id)).emit("memberJoined", {
        userId: req.user._id,
        name: req.user.name,
      });

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// ✅ Kick a user (only group admin)
router.post("/:id/kick", auth, async (req, res) => {
  try {
    const { userId } = req.body;
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ error: "Group not found" });

    if (String(group.admin) !== String(req.user._id))
      return res.status(403).json({ error: "Only group admin can kick" });

    group.members = group.members.filter((m) => String(m) !== String(userId));
    await group.save();

    const io = req.app.get("io");
    if (io) {
      io.to(String(group._id)).emit("memberKicked", {
        userId,
        groupId: group._id,
      });
      io.to(`user_${userId}`).emit("kicked", { groupId: group._id });
    }

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});


// // ✅ Create a group (only owner)
// router.post("/", auth, async (req, res) => {
//   try {
//     if (!req.user.isOwner) {
//       return res.status(403).json({ error: "Only owners can create groups" });
//     }

//     const { name, description } = req.body;
//     const group = new Group({
//       name,
//       description,
//       owner: req.user.email,
//       members: [req.user.email], // creator joins automatically
//     });

//     await group.save();

//     const io = req.app.get("io");
//     if (io) io.emit("groupCreated", { group });

//     res.status(201).json(group);
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ error: "Server error" });
//   }
// });
router.post("/", auth, async (req, res) => {
  try {
    if (!req.user.isOwner) {
      return res.status(403).json({ error: "Only owners can create groups" });
    }

    const { name, description } = req.body;

    const group = new Group({
  name,
  description,
   owner: req.user._id,        // ✅ FIX: this was missing
  admin: req.user.isOwner ? null : req.user._id,
  members: req.user.isOwner ? [] : [req.user._id],
  admin: req.user._id,        // optional — owner can also be admin
      members: [req.user._id],
});

    await group.save();

    res.status(201).json(group);
  } catch (err) {
    console.error("Error creating group:", err);
    res.status(500).json({ error: "Server error" });
  }
});




// ✅ Update group description (only admin)
router.put("/:id", auth, async (req, res) => {
  try {
    const { description } = req.body;
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ error: "Group not found" });

    if (String(group.admin) !== String(req.user._id))
      return res.status(403).json({ error: "Only admin can update group" });

    group.description = description;
    await group.save();

    const io = req.app.get("io");
    if (io)
      io.to(String(group._id)).emit("groupUpdated", {
        groupId: group._id,
        description,
      });

    res.json({ success: true, group });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
