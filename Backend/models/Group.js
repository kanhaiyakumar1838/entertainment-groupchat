// models/Group.js
const mongoose = require("mongoose");

const GroupSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description:{type:String},
  owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  admin: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // <-- add this
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
});

module.exports = mongoose.model("Group", GroupSchema);
