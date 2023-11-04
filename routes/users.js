const express = require("express");
const router = express.Router();
const User = require("../models/User");
const Post = require("../models/Post");
// const Conversation = require("../models/Conversation");
const fs = require("fs");
const { uploadProfilePhoto } = require("../middlewares/upload");
const {
  registerValidation,
  loginValidation,
  updateInfoValidation,
  pomValidation,
} = require("../middlewares/validation");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const verify = require("../middlewares/verifyToken");

//REGISTER A USER
router.post("/auth/register", registerValidation, async (req, res) => {
  // IS USER IN DATABASE
  const emailExist = await User.findOne({ email: req.body.email });
  if (emailExist) {
    return res
      .status(400)
      .json({ success: false, message: "Email already exists" });
  }

  const usernameExist = await User.findOne({ username: req.body.username });
  if (usernameExist) {
    return res
      .status(400)
      .json({ success: false, message: "Username already exists" });
  }

  //HASH PASSWORDS
  const salt = await bcrypt.genSalt(10);
  const hashPassword = await bcrypt.hash(req.body.password, salt);

  const user = new User({
    username: req.body.username,
    email: req.body.email,
    fullname: req.body.fullname,
    password: hashPassword,
  });

  try {
    const savedUser = await user.save();

    //CREATE and assign token
    const token = jwt.sign({ _id: user._id }, process.env.TOKEN_SECRET);
    res.header("auth-token", token).json({ user: savedUser });
  } catch (err) {
    res.json({ success: false, message: err.message });
  }
});

//LOGIN
router.post("/auth/login", loginValidation, async (req, res) => {
  try {
    //FINDING USER
    const user = await User.findOne({ username: req.body.username });
    if (!user) {
      return res
        .status(400)
        .json({ success: false, message: "Username or password is wrong" });
    }

    //IS PASSWORD CORRECT
    const validPass = await bcrypt.compare(req.body.password, user.password);
    if (!validPass) {
      return res
        .status(400)
        .json({ success: false, message: "Username or password is wrong" });
    }

    //CREATE and assign token
    const token = jwt.sign({ user }, process.env.TOKEN_SECRET);
    res.header("auth-token", token).json({ user: user });
  } catch (err) {
    res.json({ success: false, message: err.message });
  }
});

//GET MY INFO
router.get("/login-with-token", verify, async (req, res) => {
  const user = await User.findById(req.user._id);
  res.json({ user });
});

//CONVERSATIONS BY USER
router.get("/conversations", verify, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate("conversations");

    res.json({ conversations: user.conversations });
  } catch (err) {
    res.json({ success: false, message: err.message });
  }
});

//SPECIFIC USER
router.get("/:userId", async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    res.json({
      username: user.username,
      fullname: user.fullname,
      profilePhoto: user.profilePhoto,
      numberOfFriends: user.numberOfFriends,
      numberOfPosts: user.numberOfPosts,
      friends: user.friends,
    });
  } catch (err) {
    res.json({ success: false, message: err.message });
  }
});

//DELETE USER
router.delete("/:userId", verify, async (req, res) => {
  console.log(req.user);
  if (req.params.userId !== req.user._id) {
    return res.json({
      success: false,
      message: "You can't delete somebody elses account ",
    });
  }
  try {
    const deletedUser = await User.findOneAndDelete({
      _id: req.params.userId,
    });
    if (deletedUser.profilePhoto !== "") {
      fs.unlink(deletedUser.profilePhoto, () => {});
    }

    const userPosts = await Post.find({ userId: req.params.userId });
    if (userPosts.length > 0) {
      userPosts.forEach((post) => fs.unlink(post.image, () => {}));
      await Post.deleteMany({ userId: req.params.userId });
    }
    if (deletedUser.friends.length > 0) {
      deletedUser.friends.forEach((friend) => {
        User.updateOne(
          { _id: friend },
          {
            $inc: {
              numberOfFriends: -1,
            },
            $pullAll: {
              friends: [req.params.userId],
            },
          }
        );
      });
    }

    res.json({
      success: true,
      message: "You successfully deleted your account",
    });
  } catch (err) {
    res.json({ success: false, message: err.message });
  }
});

//UPDATE USER INFO
router.patch(
  "/update-info",
  [verify, updateInfoValidation],
  async (req, res) => {
    // IS USER IN DATABASE
    if (req.body.email) {
      const emailExist = await User.findOne({ email: req.body.email });
      if (emailExist) {
        return res
          .status(400)
          .json({ success: false, message: "Email already exists" });
      }
    }

    if (req.body.username) {
      const usernameExist = await User.findOne({ username: req.body.username });
      if (usernameExist) {
        return res
          .status(400)
          .json({ success: false, message: "Username already exists" });
      }
    }

    //HASH PASSWORDS
    let hashPassword;
    if (req.body.password) {
      const salt = await bcrypt.genSalt(10);
      hashPassword = await bcrypt.hash(req.body.password, salt);
    }
    try {
      await User.findOneAndUpdate(
        { _id: req.user._id },
        {
          $set: {
            username: req.body.username,
            fullname: req.body.fullname,
            email: req.body.email,
            password: req.body.password && hashPassword,
          },
        }
      );
      res.json({ success: true, message: "You successfully updated user" });
    } catch (err) {
      res.json({ success: false, message: err.message });
    }
  }
);

//UPLOADING PROFILE PHOTO
router.patch(
  "/upload-profile-photo",
  [verify, uploadProfilePhoto.single("profilePhoto")],
  async (req, res) => {
    try {
      const user = await User.findOneAndUpdate(
        { _id: req.user._id },
        {
          $set: {
            profilePhoto: req.file.path,
          },
        }
      );
      if (user.profilePhoto !== "") {
        console.log(user.profilePhoto);
        fs.unlink(user.profilePhoto, () => {});
      }
      res.json({
        success: true,
        message: "You successfully uploaded your profile photo",
      });
    } catch (err) {
      res.json({ success: false, message: err.message });
    }
  }
);

//DELETING PROFILE PHOTO
router.patch(
  "/remove-profile-photo",
  [verify, uploadProfilePhoto.single("profilePhoto")],
  async (req, res) => {
    try {
      const user = await User.findOneAndUpdate(
        { _id: req.user._id },
        {
          $set: {
            profilePhoto: "",
          },
        }
      );
      if (user.profilePhoto !== "") {
        fs.unlink(user.profilePhoto, () => {});
      } else {
        return res.json({
          success: false,
          message: "You don't have a profile photo",
        });
      }
      res.json({
        success: true,
        message: "You successfully removed your profile photo",
      });
    } catch (err) {
      res.json({ success: false, message: err.message });
    }
  }
);

//UPDATE USER FRIEND REQUESTS
router.patch("/friend-requests", verify, async (req, res) => {
  let typeOfRequest;

  if (!req.body.confirmRequest && !req.body.pullRequest) {
    typeOfRequest = 0; //0 = sendingFriendRequest
  } else if (req.body.confirmRequest === "1") {
    typeOfRequest = 1; //1 = acceptingFriendRequest
  } else if (req.body.confirmRequest === "0") {
    typeOfRequest = 2; //2 = removingFriendRequest
  } else if (!req.body.confirmRequest && req.body.pullRequest === "1") {
    typeOfRequest = 3; //3 = poolingFriendRequest
  }

  try {
    if (typeOfRequest === 0) {
      if (req.user._id === req.body.potentialFriendId) {
        return res.json({
          success: false,
          message: "You can't send yourself a friend request",
        });
      }

      const potentialFriend = await User.findById(req.body.potentialFriendId);
      if (potentialFriend.friendRequests.includes(req.user._id)) {
        return res.json({
          success: false,
          message: "You already sent friend request",
        });
      }

      if (potentialFriend.friends.includes(req.user._id)) {
        return res.json({
          success: false,
          message: "You are already friends with this user",
        });
      }

      await User.updateOne(
        { _id: req.body.potentialFriendId },
        {
          $push: {
            friendRequests: req.user._id,
          },
        }
      );
    } else if (typeOfRequest === 1) {
      if (req.user._id === req.body.newFriendId) {
        return res.json({
          success: false,
          message: "You can't have yourself as a friend",
        });
      }

      const me = await User.findById(req.user._id);
      if (!me.friendRequests.includes(req.body.newFriendId)) {
        return res.json({
          success: false,
          message: "You can't accept friend request that doesn't exist",
        });
      }

      if (me.friends.includes(req.body.newFriendId)) {
        return res.json({
          success: false,
          message: "You are already friends with this user",
        });
      }

      await User.updateOne(
        { _id: req.user._id },
        {
          $pullAll: {
            friendRequests: [req.body.newFriendId],
          },
          $push: {
            friends: req.body.newFriendId,
          },
          $inc: {
            numberOfFriends: 1,
          },
        }
      );
      await User.updateOne(
        { _id: req.body.newFriendId },
        {
          $push: {
            friends: req.user._id,
          },
          $inc: {
            numberOfFriends: 1,
          },
        }
      );
    } else if (typeOfRequest === 2) {
      const me = await User.findById(req.user._id);
      if (!me.friendRequests.includes(req.body.newFriendId)) {
        return res.json({
          success: false,
          message: "You can't remove friend request that doesn't exist",
        });
      }

      await User.updateOne(
        { _id: req.user._id },
        {
          $pullAll: {
            friendRequests: [req.body.newFriendId],
          },
        }
      );
    } else if (typeOfRequest === 3) {
      const potentialFriend = await User.findById(req.body.potentialFriendId);
      if (!potentialFriend.friendRequests.includes(req.user._id)) {
        return res.json({
          success: false,
          message: "You can't pool friend request that doesn't exist",
        });
      }
      await User.updateOne(
        { _id: req.body.potentialFriendId },
        {
          $pullAll: {
            friendRequests: [req.user._id],
          },
        }
      );
    }
    res.json({ success: true, message: "Updated successfully" });
  } catch (err) {
    res.json({ success: false, message: err.message });
  }
});

//REMOVING FRIEND
router.patch("/remove-friend", verify, async (req, res) => {
  const me = await User.findById(req.user._id);
  if (!me.friends.includes(req.body.friendId)) {
    return res.json({
      success: false,
      message:
        "You can't remove user from your friends because he isn't your friend",
    });
  }

  try {
    await User.updateOne(
      { _id: req.user._id },
      {
        $inc: {
          numberOfFriends: -1,
        },
        $pullAll: {
          friends: [req.body.friendId],
        },
      }
    );

    await User.updateOne(
      { _id: req.body.friendId },
      {
        $inc: {
          numberOfFriends: -1,
        },
        $pullAll: {
          friends: [req.user._id],
        },
      }
    );

    res.json({ success: true, message: "Updated successfully" });
  } catch (err) {
    res.json({ success: false, message: err.message });
  }
});

//GET USER FRIENDS
router.get("/friends/:userId", async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).populate("friends");

    const friends = user.friends;

    res.json(friends);
  } catch (err) {
    res.json({ success: false, message: err.message });
  }
});

module.exports = router;
