
const socket = io();

const chat = document.getElementById("chat");
const input = document.getElementById("messageInput");
const sendButton = document.getElementById("sendButton");
const imageInput = document.getElementById("imageInput");
const online = document.getElementById("online");

function sendMessage() {
  const text = input.value.trim();

  if (!text) return;

  socket.emit("chat-message", {
    text: text
  });

  input.value = "";
}

sendButton.addEventListener("click", sendMessage);

input.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    sendMessage();
  }
});

imageInput.addEventListener("change", async () => {
  const file = imageInput.files[0];

  if (!file) return;

  if (file.size > 2 * 1024 * 1024) {
    alert("Image must be smaller than 2 MB.");
    imageInput.value = "";
    return;
  }

  const allowed = [
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp"
  ];

  if (!allowed.includes(file.type)) {
    alert("Unsupported image type.");
    imageInput.value = "";
    return;
  }

  const formData = new FormData();
  formData.append("image", file);

  try {
    const response = await fetch("/upload", {
      method: "POST",
      body: formData
    });

    if (!response.ok) throw new Error("Upload failed");

    const result = await response.json();

    socket.emit("chat-message", {
      image: result.image
    });

  } catch (error) {
    alert("Could not upload image.");
  }

  imageInput.value = "";
});

socket.on("chat-message", (data) => {
  const message = document.createElement("div");
  message.className = "message";

  const username = document.createElement("div");
  username.className = "username";
  username.textContent = data.username;

  message.appendChild(username);

  if (data.text) {
    const text = document.createElement("div");
    text.textContent = data.text;
    message.appendChild(text);
  }

  if (data.image) {
    const image = document.createElement("img");
    image.src = data.image;
    image.alt = "Shared image";
    message.appendChild(image);
  }

  chat.appendChild(message);
  chat.scrollTop = chat.scrollHeight;
});

socket.on("online-count", (count) => {
  online.textContent = "🟢 " + count + " people online";
});
