
const SUPABASE_URL = "https://vcnvyqmcuekjpajeevze.supabase.co/";
const SUPABASE_KEY = "sb_publishable_Kxe-IRP9FnsHgKtTkyLsVA_qfM00kJI";

const db = supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);

const chat = document.getElementById("chat");
const input = document.getElementById("messageInput");
const sendButton = document.getElementById("sendButton");
const online = document.getElementById("online");

const username = "Guest-" +
  Math.floor(1000 + Math.random() * 9000);

// Display a message
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
    online.textContent = "Database connection error";
    return;
  }

  chat.replaceChildren();

  data.forEach(displayMessage);
}

// Send a message
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
    alert("Message failed to send: " + error.message);
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

// Listen for new messages
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
