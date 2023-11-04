const mongoose = require("mongoose");
const Conversation = require("./Conversation");

const UserSchema = mongoose.Schema({
  username: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
  },
  fullname: {
    type: String,
    default: "",
  },
  password: {
    type: String,
    required: true,
  },
  profilePhoto: {
    type: String,
    default: "",
  },
  numberOfFriends: {
    type: Number,
    default: 0,
  },
  numberOfPosts: {
    type: Number,
    default: 0,
  },
  friends: [{ type: mongoose.Schema.Types.ObjectId, ref: "Users" }],
  friendRequests: [{ type: mongoose.Schema.Types.ObjectId, ref: "Users" }],
  conversations: [
    { type: mongoose.Schema.Types.ObjectId, ref: "Conversations" },
  ],
});

module.exports = mongoose.model("Users", UserSchema);
