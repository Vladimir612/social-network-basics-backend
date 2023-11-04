const express = require("express");
const router = express.Router();
const Post = require("../models/Post");
const User = require("../models/User");
const fs = require("fs");
const { uploadPostPhoto } = require("../middlewares/upload");
const verify = require("../middlewares/verifyToken");

//SUBMITS A POST
router.post(
  "/",
  verify,
  uploadPostPhoto.single("postPhoto"),
  async (req, res) => {
    const post = new Post({
      image: req.file.path,
      description: req.body.description,
      userId: req.user._id,
    });

    try {
      const savedPost = await post.save();
      await User.updateOne(
        { _id: req.user._id },
        {
          $inc: {
            numberOfPosts: 1,
          },
        }
      );
      res.json({ savedPost });
    } catch (err) {
      res.json({ success: false, message: err.message });
    }
  }
);

//POSTS BY USER
router.get("/:userId", verify, async (req, res) => {
  try {
    //CHECKING IF CREATOR OF THIS POST IS USERS FRIEND
    const creator = await User.findOne({ _id: req.params.userId });
    JSON.stringify(creator._id);
    if (
      !creator.friends.includes(req.user._id) &&
      String(creator._id) !== req.user._id
    ) {
      return res.status(400).json({
        success: false,
        message: "You can't view this post, you are not users friend",
      });
    }
    const postsByUser = await Post.find({ userId: req.params.userId });
    res.json({ postsByUser });
  } catch (err) {
    res.json({ success: false, message: err.message });
  }
});

//LIKE POST
router.patch("/like/:postId", verify, async (req, res) => {
  try {
    //CHECKING IF CREATOR OF THIS POST IS LIKERS FRIEND
    const post = await Post.findOne({ _id: req.params.postId });
    const creator = await User.findOne({ _id: post.userId });

    if (
      !creator.friends.includes(req.user._id) &&
      String(creator._id) !== req.user._id
    ) {
      return res.status(400).json({
        success: false,
        message: "You can't like this post, you are not users friend",
      });
    }
    await Post.updateOne(
      { _id: req.params.postId },
      {
        $push: {
          likedBy: req.user._id,
        },
        $inc: {
          numberOfLikes: 1,
        },
      }
    );
    res.json({ success: true, message: "You successfully liked a post" });
  } catch (err) {
    res.json({ success: false, message: err.message });
  }
});

//UNLIKE POST
router.patch("/unlike/:postId", verify, async (req, res) => {
  try {
    //CHECKING IF CREATOR OF THIS POST IS LIKERS FRIEND
    const post = await Post.findOne({ _id: req.params.postId });
    const creator = await User.findOne({ _id: post.userId });

    if (
      !creator.friends.includes(req.user._id) &&
      String(creator._id) !== req.user._id
    ) {
      return res.status(400).json({
        success: false,
        message: "You can't unlike this post, you are not users friend",
      });
    }

    if (
      !post.likedBy.includes(req.user._id) &&
      String(creator._id) !== req.user._id
    ) {
      return res.status(400).json({
        success: false,
        message: "You can't unlike this post, you didn't like it",
      });
    }

    await Post.updateOne(
      { _id: req.params.postId },
      {
        $pullAll: {
          likedBy: [req.user._id],
        },
        $inc: {
          numberOfLikes: -1,
        },
      }
    );
    res.json({ success: true, message: "You successfully unliked a post" });
  } catch (err) {
    res.json({ success: false, message: err.message });
  }
});

//COMMENT POST
router.patch("/comment/:postId", verify, async (req, res) => {
  const comment = {
    userId: req.user._id,
    comment: req.body.comment,
  };
  try {
    //CHECKING IF CREATOR OF THIS POST IS COMMENTORS FRIEND
    const post = await Post.findOne({ _id: req.params.postId });
    const creator = await User.findOne({ _id: post.userId });

    if (
      !creator.friends.includes(req.user._id) &&
      String(creator._id) !== req.user._id
    ) {
      return res.status(400).json({
        success: false,
        message: "You can't comment on this post, you are not users friend",
      });
    }
    await Post.updateOne(
      { _id: req.params.postId },
      {
        $push: {
          comments: comment,
        },
      }
    );
    res.json({
      success: true,
      message: "You successfully commented on a post",
    });
  } catch (err) {
    res.json({ success: false, message: err.message });
  }
});

//DELETE COMMENT
router.patch("/delete-comment/:postId", verify, async (req, res) => {
  try {
    //CHECKING IF CREATOR OF THIS POST IS COMMENTORS FRIEND
    const post = await Post.findOne({ _id: req.params.postId });
    const creator = await User.findOne({ _id: post.userId });

    if (
      !creator.friends.includes(req.user._id) &&
      String(creator._id) !== req.user._id
    ) {
      return res.status(400).json({
        success: false,
        message:
          "You can't delete comment on this post, you are not users friend",
      });
    }
    //ALLOW DELETING COMMENT ONLY IF ITS USERS COMMENT OR ITS MY POST
    const comment = await post.comments.find(
      (comm) => String(comm._id) === req.body.commentId
    );

    if (
      req.user._id !== String(post.userId) &&
      req.user._id !== String(comment.userId)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "You can't delete comment on this post, you are not created it or this isn't your post",
      });
    }

    await Post.updateOne(
      { _id: req.params.postId },
      {
        $pull: {
          comments: { _id: req.body.commentId },
        },
      }
    );

    res.json({
      success: true,
      message: "You successfully deleted comment",
    });
  } catch (err) {
    res.json({ success: false, message: err.message });
  }
});

//DELETE POST
router.delete("/:postId", verify, async (req, res) => {
  try {
    const post = await Post.findOne({ _id: req.params.postId });
    if (String(post.userId) !== req.user._id) {
      return res.status(400).json({
        success: false,
        message: "You can't delete this post, you are not created it!",
      });
    }

    await Post.deleteOne({ _id: req.params.postId });
    fs.unlink(post.image, () => {});

    await User.updateOne(
      { _id: req.user._id },
      {
        $inc: {
          numberOfPosts: -1,
        },
      }
    );

    res.json({
      success: true,
      message: "You successfully deleted your post",
    });
  } catch (err) {
    res.json({ success: false, message: err.message });
  }
});

module.exports = router;
