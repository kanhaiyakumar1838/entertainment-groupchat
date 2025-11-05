// frontend/src/components/Chat.js
import { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import PaintModal from "./PaintModal";
import { FaPlus, FaImage, FaPaintBrush, FaYoutube, FaSmile, FaMicrophone, FaPaperPlane } from "react-icons/fa";
import YouTubeSearchModal from "./YouTubeSearchModal";
import EmojiGifPicker from "./EmojiGifPicker";

import { io } from "socket.io-client";
import FloatingPlayer from "./FloatingPlayer";

import "./Chat.css"; // <-- imported CSS (new file)

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
  const socket = useRef(null);
  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const [floatingVideo, setFloatingVideo] = useState(null);
  // optional: initial position state
  const [floatingPos, setFloatingPos] = useState({ x: 20, y: 80 });

  const API_URL = process.env.REACT_APP_API_URL;

  useEffect(() => {
    if (!showMenu) return;
    const onDocClick = (e) => {
      // if click is outside the menu/button, close it
      // identify the menu/button by ref if needed; simple approach:
      if (!e.target.closest || !e.target.closest("button")) {
        setShowMenu(false);
        return;
      }
      // If you want precise detection, add refs to the button/menu and check .contains()
    };
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, [showMenu]);

  // Fetch messages on load
  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const res = await axios.get(`${API_URL}/messages/${groupId}`, authHeader);
        setMessages(res.data);
      } catch (err) {
        console.error("Error fetching messages:", err);
      }
    };
    fetchMessages();
  }, [groupId]);

  useEffect(() => {
    socket.current = io(API_URL);

    // Join the group room on socket server
    socket.current.emit("joinGroup", groupId);

    // Listen for new messages from server
    socket.current.on("messageReceived", (msg) => {
      setMessages((prev) => [...prev, msg]);
    });

    // Cleanup when leaving the chat
    return () => {
      socket.current.disconnect();
    };
  }, [groupId]);

  // 🧭 Auto-scroll after messages change
  useEffect(() => {
    if (!chatContainerRef.current) return;
    chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
  }, [messages]);

// small helper to check if a string is a URL
const isUrl = (s) => {
  try {
    new URL(s);
    return true;
  } catch {
    return false;
  }
};

// choose mime from URL path or provider heuristics
const getMimeFromUrl = (url) => {
  if (!url) return null;
  const path = url.split("?")[0].toLowerCase();
  if (path.endsWith(".gif")) return "image/gif";
  if (path.endsWith(".mp4")) return "video/mp4";
  if (path.endsWith(".webm")) return "video/webm";
  if (path.endsWith(".webp")) return "image/webp";
  // common provider pages: treat them as gif by default (tenor/giphy)
  if (url.includes("tenor.com") || url.includes("giphy.com")) return "image/gif";
  return null;
};

// returns true if string is a direct media link we can post as media
const isDirectMediaUrl = (s) => {
  if (!s) return false;
  const trimmed = s.trim();
  if (!isUrl(trimmed)) return false;
  return !!getMimeFromUrl(trimmed);
};



  // Generic message sender
  const postMessage = async (payload) => {
    try {
      const res = await axios.post(
        `${API_URL}/messages/${groupId}`,
        payload,
        authHeader
      );
      // setMessages((m) => [...m, res.data]);
      // 🔥 Emit the new message to all connected users
      socket.current.emit("newMessage", groupId, res.data);
    } catch (err) {
      console.error("Error sending message:", err);
    }
  };

  const sendMessage = async () => {
  const trimmed = text.trim();
  if (!trimmed) return;

  // if text is a direct media URL, send it as media instead of text
  if (isDirectMediaUrl(trimmed)) {
    const mimetype = getMimeFromUrl(trimmed) || "image/gif"; // fallback
    await postMessage({ text: "", media: { url: trimmed, mimetype, external: true } });
    setText("");
    return;
  }

  // otherwise send regular text
  await postMessage({ text: trimmed });
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
      const media = { url: res.data.url, mimetype: res.data.mimetype, external: true };
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
    <div className="chat-container">

      <h2 style={{ display: "none" }}>Group Chat</h2>

      {/* Messages */}
      <div
        ref={chatContainerRef}
        className="chat-box"
      >
        {messages.map((msg) => (

          <div key={msg._id} className="message-item">
            <div className="message-sender">
              <strong>{msg.sender?.username || "Unknown"}</strong>
              <span className="message-time">
                {new Date(msg.createdAt).toLocaleString()}
              </span>
            </div>

            {msg.text && <div className="message-text" >{msg.text}</div>}
            {/* ✅ Media (image/video/audio) */}
            {msg.media && (
              <div className="message-media" style={{ marginTop: msg.text ? 6 : 2 }}>
                {msg.media.mimetype?.startsWith("image/") ? (
                  <img
                    src={msg.media.external ? msg.media.url : `${API_URL}${msg.media.url}`}
                    alt="media"
                  />
                ) : msg.media.mimetype?.startsWith("video/") ? (
                  <video
                    controls
                    src={msg.media.external ? msg.media.url : `${API_URL}${msg.media.url}`}
                  />
                ) : msg.media.mimetype?.startsWith("audio/") ? (
                  <audio
                    controls
                    src={msg.media.external ? msg.media.url : `${API_URL}${msg.media.url}`}
                  />
                ) : null}
              </div>
            )}

            {msg.youtube && (
              <div
                onClick={() => {
                  // open floating player for this video
                  setFloatingVideo({
                    videoId: msg.youtube.videoId,
                    title: msg.youtube.title,
                    thumbnail: msg.youtube.thumbnail,
                  });
                }}
                className="youtube-card"
                title="Click to open floating player"
              >
                <img
                  src={msg.youtube.thumbnail}
                  alt="thumb"
                  className="youtube-thumb"
                />
                <div>
                  <div className="youtube-title">{msg.youtube.title}</div>
                  <a
                    href={`https://www.youtube.com/watch?v=${msg.youtube.videoId}`}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(e) => e.stopPropagation()} // allow opening link without opening floating player
                  >
                    Watch on YouTube
                  </a>
                </div>
              </div>
            )}
            {/* Reactions */}
            <div className="reaction-row">
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

      <div className="input-row">
        <div style={{ position: "relative" }}>
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="plus-button"
            style={{ padding: 6, borderRadius: 8 }}
          >
            <FaPlus />
          </button>

          {showMenu && (
            <div className="menu-panel">
              <div className="menu-row">
                <label className="menu-item">
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
                  className="menu-item"
                >
                  <FaPaintBrush /> <div style={{ fontSize: 12 }}>Paint</div>
                </button>

                <button
                  onClick={() => {
                    setShowYouTubeModal(true);
                    setShowMenu(false);
                  }}
                  className="menu-item"
                >
                  <FaYoutube /> <div style={{ fontSize: 12 }}>YouTube</div>
                </button>
              </div>
            </div>
          )}
        </div>

        <button
          onClick={() => setPickerOpen(true)}
          className="picker-button"
          title="Open emoji / gif picker"
        >
          <FaSmile />
        </button>

        <textarea
  value={text}
  onChange={async (e) => {
    const newVal = e.target.value.trim();
    setText(newVal);

    // ✅ If user typed/pasted a GIF link, auto-send immediately
    if (isDirectMediaUrl(newVal)) {
      const mimetype = getMimeFromUrl(newVal) || "image/gif";
      await postMessage({
        text: "",
        media: { url: newVal, mimetype, external: true },
      });
      setText(""); // clear textarea instantly
    }
  }}
  placeholder="Type a message"
  rows={1}
  className="chat-textarea"
/>


        {/* 🎤 Microphone */}
        <button
          onClick={toggleRecording}
          className="mic-button"
          style={{
            background: recording ? "#ff4b4b" : "#eee",
            color: recording ? "#fff" : "#333",
          }}
          title={recording ? "Stop Recording" : "Start Recording"}
        >
          <FaMicrophone />
        </button>

        {/* ✅ Send icon */}
        <button
          onClick={sendMessage}
          className="send-button"
        >
          <FaPaperPlane />
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
            await postMessage({ text: "", media: { url: gifUrl, mimetype: "image/gif", external: true } });
          }}
          onClose={() => setPickerOpen(false)}
        />
      )}

      {/* Floating player */}
      {floatingVideo && (
        <FloatingPlayer
          video={floatingVideo}
          onClose={() => setFloatingVideo(null)}
          initialPos={floatingPos}
        />
      )}

    </div>
  );
}
