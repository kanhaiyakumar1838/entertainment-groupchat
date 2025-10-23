// frontend/src/components/Chat.js
import { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import PaintModal from "./PaintModal";
import { FaPlus, FaImage, FaPaintBrush, FaYoutube } from "react-icons/fa";
import YouTubeSearchModal from "./YouTubeSearchModal";
import EmojiGifPicker from "./EmojiGifPicker";
import { FaSmile } from "react-icons/fa";
import { FaMicrophone } from "react-icons/fa";




export default function Chat() {
  const { groupId } = useParams();
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [showMenu, setShowMenu] = useState(false);
  const [paintOpen, setPaintOpen] = useState(false);
  const [showYouTubeModal, setShowYouTubeModal] = useState(false);
  const fileInputRef = useRef();

  const token = localStorage.getItem("token");
  const authHeader = { headers: { Authorization: `Bearer ${token}` } };
  const [pickerOpen, setPickerOpen] = useState(false);
  const [recording, setRecording] = useState(false);
const [mediaRecorder, setMediaRecorder] = useState(null);
const [audioChunks, setAudioChunks] = useState([]);

const API_URL = process.env.REACT_APP_API_URL;

  // Fetch messages on load
  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const res = await axios.get(
          `${API_URL}/api/messages/${groupId}`,
          authHeader
        );
        setMessages(res.data);
      } catch (err) {
        console.error("Error fetching messages:", err);
      }
    };
    fetchMessages();
  }, [groupId]);

  // Generic message sender
  const postMessage = async (payload) => {
    try {
      const res = await axios.post(
        `${API_URL}/messages/${groupId}`,
        payload,
        authHeader
      );
      setMessages((m) => [...m, res.data]);
    } catch (err) {
      console.error("Error sending message:", err);
    }
  };

  const sendMessage = async () => {
    if (!text.trim()) return;
    await postMessage({ text });
    setText("");
  };

  // File upload (image/video)
  const handleFile = async (file) => {
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await axios.post(`${API_URL}/upload`, fd, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });
      const media = { url: res.data.url, mimetype: res.data.mimetype };
      await postMessage({ text: "", media });
    } catch (err) {
      console.error("Upload error:", err);
      alert("Upload failed");
    }
  };

  const onFileChange = (e) => {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
    e.target.value = null;
    setShowMenu(false);
  };

  // Paint send: receives dataURL
  const handlePaintSend = async (dataUrl) => {
    const blob = dataURLtoBlob(dataUrl);
    const file = new File([blob], `drawing-${Date.now()}.png`, { type: "image/png" });
    await handleFile(file);
  };

  function dataURLtoBlob(dataurl) {
    const arr = dataurl.split(",");
    const mime = arr[0].match(/:(.*?);/)[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) u8arr[n] = bstr.charCodeAt(n);
    return new Blob([u8arr], { type: mime });
  }

  // Send YouTube video
  const sendYouTubeVideo = async (video) => {
    await postMessage({
      text: `🎬 ${video.title}`,
      youtube: {
        videoId: video.url.split("v=")[1],
        title: video.title,
        thumbnail: video.thumbnail,
      },
    });
    setShowYouTubeModal(false);
  };

  // 🎤 Start or stop recording audio
const toggleRecording = async () => {
  try {
    if (recording && mediaRecorder) {
      // Stop recording
      mediaRecorder.stop();
      setRecording(false);
      return;
    }

    // Ask permission
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const recorder = new MediaRecorder(stream);
    setMediaRecorder(recorder);
    setAudioChunks([]);

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) setAudioChunks((prev) => [...prev, e.data]);
    };

    recorder.onstop = async () => {
      const blob = new Blob(audioChunks, { type: "audio/webm" });
      const file = new File([blob], `audio-${Date.now()}.webm`, { type: "audio/webm" });
      await handleFile(file);
      stream.getTracks().forEach((track) => track.stop());
    };

    recorder.start();
    setRecording(true);
  } catch (err) {
    console.error("Microphone access error:", err);
    alert("Microphone access denied or not available.");
  }
};


  return (
    <div style={{ padding: 12 }}>
      <h2>Group Chat</h2>

      {/* Messages */}
      <div
        style={{
          border: "1px solid #ccc",
          height: 380,
          overflowY: "auto",
          padding: 8,
          borderRadius: 8,
        }}
      >
        {messages.map((msg) => (
          
          <div key={msg._id} style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 13, color: "#333" }}>
              <strong>{msg.sender?.username || "Unknown"}</strong>
              <span
                style={{ marginLeft: 8, color: "#888", fontSize: 12 }}
              >
                {new Date(msg.createdAt).toLocaleString()}
              </span>
            </div>

            {msg.text && <div style={{ marginTop: 4 }}>{msg.text}</div>}
{/* ✅ Media (image/video/audio) */}
{msg.media && (
  <div style={{ marginTop: msg.text ? 6 : 2 }}>
    {msg.media.mimetype?.startsWith("image/") ? (
      <img
        src={msg.media.external ? msg.media.url : `${API_URL}${msg.media.url}`}
        alt="media"
        style={{ maxWidth: 300, borderRadius: 6 }}
      />
    ) : msg.media.mimetype?.startsWith("video/") ? (
      <video
        controls
        src={msg.media.external ? msg.media.url : `${API_URL}${msg.media.url}`}
        style={{ maxWidth: 360 }}
      />
    ) : msg.media.mimetype?.startsWith("audio/") ? (
      <audio
        controls
        src={msg.media.external ? msg.media.url : `${API_URL}${msg.media.url}`}
        style={{ width: 250 }}
      />
    ) : null}
  </div>
)}




            {msg.youtube && (
              <div
                style={{
                  marginTop: 6,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <img
                  src={msg.youtube.thumbnail}
                  alt="thumb"
                  style={{ width: 120, borderRadius: 6 }}
                />
                <div>
                  <div style={{ fontWeight: "bold" }}>
                    {msg.youtube.title}
                  </div>
                  <a
                    href={`https://www.youtube.com/watch?v=${msg.youtube.videoId}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Watch on YouTube
                  </a>
                </div>
              </div>
            )}
            {/* Reactions */}
<div style={{ display: "flex", gap: 12, marginTop: 4, fontSize: 14 }}>
  {["like", "heart"].map((type) => {
    const count = msg.reactions?.filter((r) => r.type === type).length || 0;
    const reacted = msg.reactions?.some(
      (r) => r.type === type && r.user._id === localStorage.getItem("userId")
    );
    const symbol = type === "like" ? "👍" : "❤️";

    return (
      <span
        key={type}
        style={{
          cursor: "pointer",
          fontWeight: reacted ? "bold" : "normal",
          userSelect: "none",
        }}
        onClick={async () => {
          try {
            const res = await axios.post(
              `${API_URL}/messages/${msg._id}/react`,
              { type },
              authHeader
            );
            // Update messages locally
            setMessages((prev) =>
              prev.map((m) => (m._id === res.data._id ? res.data : m))
            );
          } catch (err) {
            console.error("Reaction error:", err);
          }
        }}
      >
        {symbol} {count}
      </span>
    );
  })}
</div>

          </div>
        ))}
      </div>

      {/* Input + Options */}
      <div
        style={{
          display: "flex",
          gap: 8,
          marginTop: 12,
          alignItems: "center",
        }}
      >
        <div style={{ position: "relative" }}>
          <button
            onClick={() => setShowMenu(!showMenu)}
            style={{ padding: 8, borderRadius: 8 }}
          >
            <FaPlus />
          </button>

          {showMenu && (
            <div
              style={{
                position: "absolute",
                top: 42,
                left: 0,
                background: "#fff",
                border: "1px solid #ddd",
                borderRadius: 8,
                padding: 8,
                zIndex: 50,
              }}
            >
              <div style={{ display: "flex", gap: 8 }}>
                <label style={menuItemStyle}>
                  <FaImage /> <div style={{ fontSize: 12 }}>Upload</div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,video/*"
                    style={{ display: "none" }}
                    onChange={onFileChange}
                  />
                </label>

                <button
                  onClick={() => {
                    setPaintOpen(true);
                    setShowMenu(false);
                  }}
                  style={menuItemStyle}
                >
                  <FaPaintBrush /> <div style={{ fontSize: 12 }}>Paint</div>
                </button>

                <button
                  onClick={() => {
                    setShowYouTubeModal(true);
                    setShowMenu(false);
                  }}
                  style={menuItemStyle}
                >
                  <FaYoutube /> <div style={{ fontSize: 12 }}>YouTube</div>
                </button>
              </div>
            </div>
          )}
        </div>
        <button
  onClick={() => setPickerOpen(true)}
  style={{
    padding: 8,
    borderRadius: 8,
    background: "#eee",
  }}
>
  <FaSmile />
</button>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type a message"
          style={{ flex: 1, padding: 8, borderRadius: 8 }}
        />

        {/* 🎤 Microphone */}
<button
  onClick={toggleRecording}
  style={{
    padding: 8,
    borderRadius: 8,
    background: recording ? "#ff4b4b" : "#eee",
    color: recording ? "#fff" : "#333",
  }}
  title={recording ? "Stop Recording" : "Start Recording"}
>
  <FaMicrophone />
</button>
        <button
          onClick={sendMessage}
          style={{
            padding: "8px 12px",
            background: "#4e54c8",
            color: "#fff",
            borderRadius: 8,
          }}
        >
          Send
        </button>
        

      </div>

      {/* Paint Modal */}
      <PaintModal
        isOpen={paintOpen}
        onClose={() => setPaintOpen(false)}
        onSend={handlePaintSend}
      />

      {/* YouTube Search Modal */}
      {showYouTubeModal && (
        <YouTubeSearchModal
          onSelect={sendYouTubeVideo}
          onClose={() => setShowYouTubeModal(false)}
        />
        
      )}
      {pickerOpen && (
  <EmojiGifPicker
    onEmoji={(emoji) => setText((t) => t + emoji)}
    onGif={async (gifUrl) => {
      console.log("Sending GIF URL:", gifUrl);
      await postMessage({ text: "", media: { url: gifUrl, mimetype: "image/gif", external: true  } });
    }}
    onClose={() => setPickerOpen(false)}
  />
)}

    </div>
  );
}

const menuItemStyle = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  padding: 8,
  borderRadius: 6,
  background: "#f6f6f6",
  cursor: "pointer",
};
