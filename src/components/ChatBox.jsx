import React, { useState } from "react";

const convertMarkdown = (text) => {
  return text
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(
      /!\[(.*?)\]\((.*?)\)/g,
      '<img src="$2" alt="$1" class="my-2 rounded shadow-md w-full max-w-xs" />'
    )
    .replace(/\n/g, "<br />");
};

const ChatBox = ({ history, onSend, lang }) => {
  const [input, setInput] = useState("");

  const handleSend = () => {
    if (!input.trim()) return;
    onSend(input);
    setInput("");
  };

  return (
    <div className="p-4 border rounded bg-white">
      <h2 className="text-xl font-bold mb-2">
        {lang === "id" ? "💬 Petualangan" : "💬 Adventure"}
      </h2>
      <div className="h-64 overflow-y-auto bg-gray-50 p-2 mb-2 border">
        {history.map((msg, idx) => (
          <div key={idx} className="mb-2 text-sm">
            <strong>{msg.role === "user" ? "🧙 You:" : "👁️ DM:"}</strong>
            <div
              dangerouslySetInnerHTML={{
                __html: convertMarkdown(msg.content),
              }}
            />
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="border flex-1 px-2 py-1"
          placeholder={
            lang === "id" ? "Apa tindakanmu?" : "What is your action?"
          }
        />
        <button
          onClick={handleSend}
          className="bg-green-600 text-white px-3 py-1 rounded"
        >
          {lang === "id" ? "Kirim" : "Send"}
        </button>
      </div>
    </div>
  );
};

export default ChatBox;
