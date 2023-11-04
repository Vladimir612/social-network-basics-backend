const mongoose = require("mongoose");

const MessageSchema = mongoose.Schema({
  fromId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Users",
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  messageType: {
    type: String,
    required: true,
  },
  date: {
    type: Date,
    default: Date.now,
  },
});

const ConversationSchema = mongoose.Schema({
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: "Users" }],
  messages: [MessageSchema],
  name: {
    type: String,
    required: false,
  },
});

module.exports = mongoose.model("Conversations", ConversationSchema);
