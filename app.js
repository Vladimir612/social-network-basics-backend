//Import packages
const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv/config");

const app = express();

app.use(bodyParser.json());

app.use(cors());
app.use("/uploads", express.static("uploads"));

//Import Routes
const userRoutes = require("./routes/users");
const postRoutes = require("./routes/posts");
const conversationRoutes = require("./routes/conversations");

app.use("/users", userRoutes);
app.use("/posts", postRoutes);
app.use("/conversations", conversationRoutes);

app.get("/", (_, res) => {
  res.send("Share it");
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => console.log("Server started"));
mongoose.connect(process.env.DB_CONNECTION, () => console.log("connected"));
