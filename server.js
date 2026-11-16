
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const multer = require("multer");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 2 * 1024 * 1024
  },
  fileFilter: (req, file, callback) => {
    const allowed = [
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/webp"
    ];

    callback(null, allowed.includes(file.mimetype));
  }
});

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.get("/script.js", (req, res) => {
  res.sendFile(path.join(__dirname, "script.js"));
});

// Image upload
app.post("/upload", upload.single("image"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      error: "Invalid image"
    });
  }

  const image = "data:" + req.file.mimetype +
    ";base64," + req.file.buffer.toString("base64");

  res.json({ image });
});

// Anonymous chat connections
io.on("connection", (socket) => {

  const username = "Guest-" +
    Math.floor(1000 + Math.random() * 9000);

  console.log(username + " joined!");

  io.emit("online-count", io.engine.clientsCount);

  let lastMessage = 0;

  socket.on("chat-message", (data) => {
    const now = Date.now();

    // Basic message rate limit
    if (now - lastMessage < 800) return;
    lastMessage = now;

    if (!data || typeof data !== "object") return;

    const message = {
      username: username
    };

    if (typeof data.text === "string") {
      const text = data.text.trim().slice(0, 500);
      if (text) message.text = text;
    }

    if (typeof data.image === "string") {
      const image = data.image;

      if (
        image.length <= 2800000 &&
        /^data:image\/(jpeg|png|gif|webp);base64,[A-Za-z0-9+/=]+$/.test(image)
      ) {
        message.image = image;
      }
    }

    if (!message.text && !message.image) return;

    // Send to EVERYONE
    io.emit("chat-message", message);
  });

  socket.on("disconnect", () => {
    console.log(username + " left!");

    io.emit("online-count", io.engine.clientsCount);
  });

});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log("Chat server running on port " + PORT);
});
