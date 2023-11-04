const express = require("express");
const router = express.Router();
const User = require("../models/User");
const Conversation = require("../models/Conversation");
const { uploadConversationPhoto } = require("../middlewares/upload");
const verify = require("../middlewares/verifyToken");
const fs = require("fs");

//SUBMITS A CONVERSATION
router.post("/", verify, async (req, res) => {
  const uniqueParticipants = [
    ...new Set([...req.body.participants, req.user._id]),
  ];
  const conversation = new Conversation({
    participants: uniqueParticipants,
    name: req.body.name,
  });

  try {
    const savedConversation = await conversation.save();

    savedConversation.participants.forEach(async (participant) => {
      await User.updateOne(
        { _id: participant },
        {
          $push: {
            conversations: savedConversation._id,
          },
        }
      );
    });
    res.json({ savedConversation });
  } catch (err) {
    res.json({ success: false, message: err.message });
  }
});

//GET SPECIFIC CONVERSATION
router.get("/:conversationId", verify, async (req, res) => {
  try {
    const conversation = await Conversation.findOne({
      _id: req.params.conversationId,
    });

    let conversationContainsUser = false;
    conversation.participants.forEach((participant) => {
      if (String(participant) === req.user._id) {
        conversationContainsUser = true;
      }
    });

    if (conversationContainsUser) {
      res.json({ conversation });
    } else {
      res.json({
        success: "false",
        message: "You are not authorized to view this conversation",
      });
    }
  } catch (err) {
    res.json({ success: false, message: err.message });
  }
});

//GET PARTICIPIANTS FROM SPECIFIC CONVERSATION
router.get("/users/:conversationId", verify, async (req, res) => {
  try {
    const conversation = await Conversation.findById(
      req.params.conversationId
    ).populate("participants");

    const participants = await conversation.participants;

    let conversationContainsUser = false;
    participants.forEach((participant) => {
      if (String(participant._id) === req.user._id) {
        conversationContainsUser = true;
      }
    });

    if (conversationContainsUser) {
      res.json({ participants });
    } else {
      res.json({
        success: "false",
        message: "You are not authorized to view this conversation",
      });
    }
  } catch (err) {
    res.json({ success: false, message: err.message });
  }
});

//NEW MESSAGE IN CONVERSATION
router.patch(
  "/messages/:conversationId",
  verify,
  uploadConversationPhoto.single("conversationPhoto"),
  async (req, res) => {
    let message = {};
    if (req.body.messageType === "0") {
      //0 - plain message
      message = {
        fromId: req.user._id,
        message: req.body.message,
        messageType: req.body.messageType,
      };
    } else if (req.body.messageType === "1") {
      //1 - photo message
      message = {
        fromId: req.user._id,
        message: req.file.path,
        messageType: req.body.messageType,
      };
    }
    try {
      const conversation = await Conversation.findOne({
        _id: req.params.conversationId,
      });

      let conversationContainsSender = false;
      conversation.participants.forEach((participant) => {
        if (String(participant) === req.user._id) {
          conversationContainsSender = true;
        }
      });

      if (!conversationContainsSender) {
        if (req.body.messageType === "1") {
          fs.unlink(req.file.path, () => {});
        }
        return res.json({
          success: "false",
          message:
            "You are not authorized to send message to this conversation",
        });
      }

      await Conversation.updateOne(
        { _id: req.params.conversationId },
        {
          $push: {
            messages: message,
          },
        }
      );
      res.json({
        success: true,
        message: "You successfully send a message",
      });
    } catch (err) {
      res.json({ success: false, message: err.message });
    }
  }
);

module.exports = router;
