// frontend/src/components/Chat.js
import { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import PaintModal from "./PaintModal";
import { FaPlus, FaImage, FaPaintBrush, FaYoutube, FaSmile, FaMicrophone, FaPaperPlane } from "react-icons/fa";
import YouTubeSearchModal from "./YouTubeSearchModal";
import EmojiGifPicker from "./EmojiGifPicker";
import { io } from "socket.io-client";

// helper: simple youtube id extractor (used elsewhere if needed)
function extractYouTubeId(url) {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtu.be")) return u.pathname.slice(1);
    if (u.searchParams.has("v")) return u.searchParams.get("v");
    const parts = u.pathname.split("/");
    return parts.pop() || parts.pop();
  } catch (err) {
    return url;
  }
}

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
  const chatContainerRef = useRef(null);
  const [autoScroll, setAutoScroll] = useState(true);

  const menuRef = useRef(null);
  const API_URL = process.env.REACT_APP_API_URL || ""; // guard if not set

  // Close menu on outside click
  useEffect(() => {
    function onDocClick(e) {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target)) {
        setShowMenu(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("touchstart", onDocClick);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("touchstart", onDocClick);
    };
  }, []);

  // Fetch messages on load (guard when API_URL not set)
  useEffect(() => {
    const fetchMessages = async () => {
      if (!API_URL) return;
      try {
        const res = await axios.get(`${API_URL}/messages/${groupId}`, authHeader);
        setMessages(res.data || []);
      } catch (err) {
        console.error("Error fetching messages:", err);
      }
    };
    if (groupId) fetchMessages();
  }, [groupId, API_URL]); // include API_URL in deps

  // Socket setup (guard if no API_URL)
  useEffect(() => {
    if (!API_URL) return;
    socket.current = io(API_URL);

    // join group
    if (socket.current && socket.current.emit) socket.current.emit("joinGroup", groupId);

    // listen for messages
    socket.current.on("messageReceived", (msg) => {
      setMessages((prev) => [...prev, msg]);
    });

    return () => {
      if (socket.current && socket.current.disconnect) socket.current.disconnect();
    };
  }, [groupId, API_URL]);

  // Auto-scroll
  useEffect(() => {
    if (!chatContainerRef.current) return;
    if (autoScroll) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages, autoScroll]);

  // Post a message to server (guard if API_URL not set)
  const postMessage = async (payload) => {
    if (!API_URL) {
      console.warn("API_URL not set — postMessage is disabled in frontend-only mode");
      return null;
    }
    try {
      const res = await axios.post(`${API_URL}/messages/${groupId}`, payload, authHeader);
      // emit if socket present
      if (socket.current && socket.current.emit) socket.current.emit("newMessage", groupId, res.data);
      // immediate local add
      setMessages((m) => [...m, res.data]);
      return res.data;
    } catch (err) {
      console.error("Error sending message:", err);
    }
  };

  const sendMessage = async () => {
    if (!text.trim()) return;
    await postMessage({ text });
    setText("");
  };

  // File upload
  const handleFile = async (file) => {
    if (!API_URL) {
      alert("Upload disabled (API_URL not configured).");
      return;
    }
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

  // ensure clicking triggers hidden file input
  const handleUploadClick = (ev) => {
    ev.stopPropagation();
    fileInputRef.current?.click();
  };

  // Paint send (dataURL)
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

  // Send YouTube video (uses simple id extractor to be safer)
  const sendYouTubeVideo = async (video) => {
    await postMessage({
      text: `🎬 ${video.title}`,
      youtube: {
        videoId: extractYouTubeId(video.url),
        title: video.title,
        thumbnail: video.thumbnail,
      },
    });
    setShowYouTubeModal(false);
  };

  // Recording toggle
  const toggleRecording = async () => {
    try {
      if (recording && mediaRecorder) {
        mediaRecorder.stop();
        setRecording(false);
        return;
      }

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
    <div
      style={{
        padding: 12,
        width: "100%",
        maxWidth: "100vw",
        boxSizing: "border-box",
        overflowX: "hidden",
      }}
    >
      <h2>Group Chat</h2>

      {/* Messages */}
      <div
        ref={chatContainerRef}
        style={{
          border: "1px solid #ccc",
          height: 380,
          overflowY: "auto",
          overflowX: "hidden",
          padding: 8,
          borderRadius: 8,
          width: "100%",
          boxSizing: "border-box",
          wordWrap: "break-word",
          maxWidth: "100vw",
        }}
      >
        {messages.map((msg, idx) => (
          <div key={msg._id || msg.id || idx} style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 13, color: "#333" }}>
              <strong>{msg.sender?.username || "Unknown"}</strong>
              <span style={{ marginLeft: 8, color: "#888", fontSize: 12 }}>
                {new Date(msg.createdAt || Date.now()).toLocaleString()}
              </span>
            </div>

            {msg.text && <div style={{ marginTop: 4 }}>{msg.text}</div>}

            {/* Media (image/video/audio) */}
            {msg.media && (
              <div style={{ marginTop: msg.text ? 6 : 2 }}>
                {msg.media.mimetype?.startsWith("image/") ? (
                  <img
                    src={msg.media.external ? msg.media.url : `${API_URL}${msg.media.url}`}
                    alt="media"
                    style={{ maxWidth: "100%", borderRadius: 6 }}
                  />
                ) : msg.media.mimetype?.startsWith("video/") ? (
                  <video controls src={msg.media.external ? msg.media.url : `${API_URL}${msg.media.url}`} style={{ maxWidth: "100%" }} />
                ) : msg.media.mimetype?.startsWith("audio/") ? (
                  <audio controls src={msg.media.external ? msg.media.url : `${API_URL}${msg.media.url}`} style={{ width: 250 }} />
                ) : null}
              </div>
            )}

            {msg.youtube && (
              <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 8 }}>
                <img src={msg.youtube.thumbnail} alt="thumb" style={{ width: 120, borderRadius: 6 }} />
                <div>
                  <div style={{ fontWeight: "bold" }}>{msg.youtube.title}</div>
                  <a href={`https://www.youtube.com/watch?v=${msg.youtube.videoId}`} target="_blank" rel="noreferrer">
                    Watch on YouTube
                  </a>
                </div>
              </div>
            )}

            {/* Reactions */}
            <div style={{ display: "flex", gap: 12, marginTop: 4, fontSize: 14 }}>
              {["like", "heart"].map((type) => {
                const count = msg.reactions?.filter((r) => r.type === type).length || 0;
                const reacted = msg.reactions?.some((r) => r.type === type && r.user?._id === localStorage.getItem("userId"));
                const symbol = type === "like" ? "👍" : "❤️";

                return (
                  <span
                    key={type}
                    style={{ cursor: "pointer", fontWeight: reacted ? "bold" : "normal", userSelect: "none" }}
                    onClick={async () => {
                      try {
                        if (!API_URL) return;
                        const res = await axios.post(`${API_URL}/messages/${msg._id}/react`, { type }, authHeader);
                        setMessages((prev) => prev.map((m) => (m._id === res.data._id ? res.data : m)));
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

      <div style={{ display: "flex", gap: 4, marginTop: 12, alignItems: "flex-end", width: "100%", overflow: "hidden" }}>
        {/* + button & menu */}
        <div style={{ position: "relative" }}>
          <button
            type="button"
            aria-label="open-menu"
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu((s) => !s);
            }}
            style={{ padding: 6, borderRadius: 8 }}
          >
            <FaPlus />
          </button>

          {showMenu && (
            <div
              ref={menuRef}
              onClick={(e) => e.stopPropagation()}
              style={{
                position: "absolute",
                top: 38,
                left: 0,
                background: "#fff",
                border: "1px solid #ddd",
                borderRadius: 8,
                padding: 6,
                zIndex: 5000,
                boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
                minWidth: 200,
              }}
            >
              <div style={{ display: "flex", gap: 6 }}>
                <div
                  style={menuItemStyle}
                  onClick={(ev) => {
                    ev.stopPropagation();
                    handleUploadClick(ev);
                    setShowMenu(false);
                  }}
                >
                  <FaImage /> <div style={{ fontSize: 12, marginLeft: 6 }}>Upload</div>
                  <input ref={fileInputRef} type="file" accept="image/*,video/*" style={{ display: "none" }} onChange={onFileChange} />
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setPaintOpen(true);
                    setShowMenu(false);
                  }}
                  style={menuItemStyle}
                >
                  <FaPaintBrush /> <div style={{ fontSize: 12, marginLeft: 6 }}>Paint</div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowYouTubeModal(true);
                    setShowMenu(false);
                  }}
                  style={menuItemStyle}
                >
                  <FaYoutube /> <div style={{ fontSize: 12, marginLeft: 6 }}>YouTube</div>
                </button>
              </div>
            </div>
          )}
        </div>

        <button type="button" onClick={() => setPickerOpen(true)} style={{ padding: 6, borderRadius: 8, background: "#eee" }}>
          <FaSmile />
        </button>

        <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Type a message" rows={1} style={{ flex: 1, padding: 8, borderRadius: 8, resize: "none", overflowY: "auto", minHeight: 40, maxHeight: 120 }} />

        <button type="button" onClick={toggleRecording} style={{ padding: 6, borderRadius: 8, background: recording ? "#ff4b4b" : "#eee", color: recording ? "#fff" : "#333" }} title={recording ? "Stop Recording" : "Start Recording"}>
          <FaMicrophone />
        </button>

        <button type="button" onClick={sendMessage} style={{ padding: 8, background: "#4e54c8", color: "#fff", borderRadius: 8, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <FaPaperPlane />
        </button>
      </div>

      {/* Paint Modal */}
      <PaintModal isOpen={paintOpen} onClose={() => setPaintOpen(false)} onSend={handlePaintSend} />

      {/* YouTube Search Modal */}
      {showYouTubeModal && <YouTubeSearchModal onSelect={sendYouTubeVideo} onClose={() => setShowYouTubeModal(false)} />}

      {pickerOpen && <EmojiGifPicker onEmoji={(emoji) => setText((t) => t + emoji)} onGif={async (gifUrl) => { console.log("Sending GIF URL:", gifUrl); await postMessage({ text: "", media: { url: gifUrl, mimetype: "image/gif", external: true } }); }} onClose={() => setPickerOpen(false)} />}
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
