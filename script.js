
const SUPABASE_URL = "YOUR_PROJECT_URL";
const SUPABASE_KEY = "YOUR_PUBLISHABLE_KEY";

const db = supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);

const chat = document.getElementById("chat");
const input = document.getElementById("messageInput");
const sendButton = document.getElementById("sendButton");
const online = document.getElementById("online");
const imageInput = document.getElementById("imageInput");

const username = "Guest-" +
  Math.floor(1000 + Math.random() * 9000);

// Display messages
function displayMessage(data) {
  const message = document.createElement("div");
  message.className = "message";

  const name = document.createElement("div");
  name.className = "username";
  name.textContent = data.username;

  message.appendChild(name);

  if (data.content) {
    const text = document.createElement("div");
    text.textContent = data.content;
    message.appendChild(text);
  }

  if (data.image_url) {
    const image = document.createElement("img");
    image.src = data.image_url;
    image.alt = "Shared image";
    image.loading = "lazy";
    message.appendChild(image);
  }

  chat.appendChild(message);
  chat.scrollTop = chat.scrollHeight;
}

// Load previous messages
async function loadMessages() {
  const { data, error } = await db
    .from("messages")
    .select("*")
    .order("created_at", { ascending: true })
    .limit(100);

  if (error) {
    console.error(error);
    online.textContent = "Database error";
    return;
  }

  chat.replaceChildren();
  data.forEach(displayMessage);
}

// Send text
async function sendMessage() {
  const text = input.value.trim();

  if (!text) return;

  sendButton.disabled = true;

  const { error } = await db
    .from("messages")
    .insert({
      username: username,
      content: text
    });

  if (error) {
    alert(error.message);
  } else {
    input.value = "";
  }

  sendButton.disabled = false;
}

sendButton.addEventListener("click", sendMessage);

input.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    sendMessage();
  }
});

// Upload images
imageInput.addEventListener("change", async () => {
  const file = imageInput.files[0];

  if (!file) return;

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

  if (file.size > 2 * 1024 * 1024) {
    alert("Images must be under 2 MB.");
    imageInput.value = "";
    return;
  }

  online.textContent = "Uploading image...";

  const filePath =
    Date.now() + "-" +
    Math.random().toString(36).slice(2) +
    "." + file.type.split("/")[1];

  const { error: uploadError } = await db
    .storage
    .from("chat-images")
    .upload(filePath, file, {
      contentType: file.type,
      upsert: false
    });

  if (uploadError) {
    alert("Image upload failed: " + uploadError.message);
    online.textContent = "Connected to global chat";
    imageInput.value = "";
    return;
  }

  const { data } = db
    .storage
    .from("chat-images")
    .getPublicUrl(filePath);

  const { error } = await db
    .from("messages")
    .insert({
      username: username,
      image_url: data.publicUrl
    });

  if (error) {
    alert("Could not send image: " + error.message);
  }

  imageInput.value = "";
  online.textContent = "Connected to global chat";
});

// Live updates
async function startChat() {
  await loadMessages();

  db.channel("global-chat")
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "messages"
      },
      (payload) => {
        displayMessage(payload.new);
      }
    )
    .subscribe((status) => {
      if (status === "SUBSCRIBED") {
        online.textContent = "🟢 Connected to global chat";
      } else if (status === "CHANNEL_ERROR") {
        online.textContent = "Chat connection error";
      }
    });
}

startChat();
