const multer = require("multer");

const storageProfilePhotos = multer.diskStorage({
  destination: (_, __, cb) => {
    cb(null, "./uploads/profilePhotos");
  },
  filename: (_, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const storagePostsPhotos = multer.diskStorage({
  destination: (_, __, cb) => {
    cb(null, "./uploads/postsPhotos");
  },
  filename: (_, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const storageConversationPhotos = multer.diskStorage({
  destination: (_, __, cb) => {
    cb(null, "./uploads/conversationPhotos");
  },
  filename: (_, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const fileFilter = (_, file, cb) => {
  //reject a file
  if (file.mimetype === "image/jpeg" || file.mimetype === "image/png") {
    cb(null, true);
  } else {
    cb(new Error("Image must be png or jpeg!"), false);
  }
};

const uploadProfilePhoto = multer({
  storage: storageProfilePhotos,
  limits: { fileSize: 1024 * 1024 * 5 },
  fileFilter: fileFilter,
});

const uploadPostPhoto = multer({
  storage: storagePostsPhotos,
  limits: { fileSize: 1024 * 1024 * 5 },
  fileFilter: fileFilter,
});

const uploadConversationPhoto = multer({
  storage: storageConversationPhotos,
  limits: { fileSize: 1024 * 1024 * 5 },
  fileFilter: fileFilter,
});

module.exports = {
  uploadProfilePhoto,
  uploadPostPhoto,
  uploadConversationPhoto,
};
