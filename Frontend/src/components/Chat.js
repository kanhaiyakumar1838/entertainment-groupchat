// frontend/src/components/Chat.js
import { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import PaintModal from "./PaintModal";
import {
  FaPlus,
  FaImage,
  FaPaintBrush,
  FaYoutube,
  FaSmile,
  FaMicrophone,
  FaPaperPlane,
} from "react-icons/fa";
import YouTubeSearchModal from "./YouTubeSearchModal";
import EmojiGifPicker from "./EmojiGifPicker";
import { io } from "socket.io-client";
import FloatingPlayer from "./FloatingPlayer";

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
  const [floatingPos] = useState({ x: 20, y: 80 });

  const API_URL = process.env.REACT_APP_API_URL;

  useEffect(() => {
    if (!showMenu) return;
    const onDocClick = (e) => {
      if (!e.target.closest || !e.target.closest("button")) {
        setShowMenu(false);
        return;
      }
    };
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, [showMenu]);

  // Fetch messages on load
  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const res = await axios.get(`${API_URL}/messages/${groupId}`, authHeader);
        setMessages(res.data || []);
      } catch (err) {
        console.error("Error fetching messages:", err);
      }
    };
    fetchMessages();
  }, [groupId]);

  // Socket setup
  useEffect(() => {
    socket.current = io(API_URL);
    socket.current.emit("joinGroup", groupId);
    const handler = (msg) => setMessages((prev) => [...prev, msg]);
    socket.current.on("messageReceived", handler);
    return () => {
      socket.current?.off?.("messageReceived", handler);
      socket.current?.disconnect?.();
    };
  }, [groupId]);

  // Auto-scroll when messages change (respecting if user scrolled up)
  useEffect(() => {
    const container = chatContainerRef.current;
    if (!container) return;
    // if user is near bottom, auto-scroll; otherwise don't disturb
    const distanceFromBottom = container.scrollHeight - (container.scrollTop + container.clientHeight);
    const nearBottom = distanceFromBottom < 150; // threshold
    if (nearBottom) {
      container.scrollTop = container.scrollHeight;
    }
  }, [messages]);

  // Generic message sender
  const postMessage = async (payload) => {
    try {
      const res = await axios.post(`${API_URL}/messages/${groupId}`, payload, authHeader);
      // emit new message to room (server should broadcast back)
      socket.current?.emit("newMessage", groupId, res.data);
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

  // Paint send
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

  // Send YouTube
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

  // Recording
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

  // Small styling helpers (kept inline for quick patch)
  const containerStyle = {
    padding: 8,
    width: "100%",
    maxWidth: "100vw",
    boxSizing: "border-box",
    overflowX: "hidden",
    display: "flex",
    flexDirection: "column",
    gap: 8,
    height: "100%",
  };

  const chatBoxStyle = {
    border: "1px solid #e6e6e6",
    borderRadius: 12,
    padding: 10,
     flex: 1,  
    height: "62vh", // larger message area
    overflowY: "auto",
    background: "#fbfbfd",
    boxSizing: "border-box",
  };

  const messageWrapperStyle = {
    display: "flex",
    flexDirection: "column",
    gap: 8,
  };

  // message card style function (differentiate self vs others if you have sender id)
  const messageCardStyle = {
    alignSelf: "stretch",
    background: "#fff",
    borderRadius: 10,
    padding: "10px 12px",
    boxShadow: "0 1px 2px rgba(16,24,40,0.04)",
    border: "1px solid rgba(0,0,0,0.03)",
    wordBreak: "break-word",
    maxWidth: "100%",
  };

  const senderStyle = { fontSize: 13, fontWeight: 700, color: "#222" };
  const timeStyle = { marginLeft: 8, color: "#888", fontSize: 12, fontWeight: 500 };

  const inputRowStyle = {
    display: "flex",
    gap: 8,
    alignItems: "center",
    paddingTop: 6,
  };

  const iconButtonStyle = {
    padding: 8,
    borderRadius: 8,
    background: "#fff",
    border: "1px solid #eee",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  };

  return (
    <div style={containerStyle}>
      {/* compact header: you wanted to remove title, so we show subtle room info only if needed */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        {/* left intentionally empty - no big title */}
        <div style={{ fontSize: 12, color: "#666" }} />
        {/* small status (optional) */}
        <div style={{ fontSize: 12, color: "#888" }}>Active</div>
      </div>

      {/* Messages container */}
      <div ref={chatContainerRef} style={chatBoxStyle}>
        <div style={messageWrapperStyle}>
          {messages.map((msg) => (
            <div key={msg._id} style={messageCardStyle}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                <div style={senderStyle}>{msg.sender?.username || "Unknown"}</div>
                <div style={timeStyle}>{new Date(msg.createdAt).toLocaleString()}</div>
              </div>

              {msg.text && (
                <div style={{ marginTop: 6, fontSize: 15, lineHeight: 1.4, color: "#222" }}>
                  {msg.text}
                </div>
              )}

              {/* Media */}
              {msg.media && (
                <div style={{ marginTop: msg.text ? 8 : 6 }}>
                  {msg.media.mimetype?.startsWith("image/") ? (
                    <img
                      src={msg.media.external ? msg.media.url : `${API_URL}${msg.media.url}`}
                      alt="media"
                      style={{ maxWidth: "100%", borderRadius: 8 }}
                    />
                  ) : msg.media.mimetype?.startsWith("video/") ? (
                    <video
                      controls
                      src={msg.media.external ? msg.media.url : `${API_URL}${msg.media.url}`}
                      style={{ maxWidth: "100%", borderRadius: 8 }}
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

              {/* YouTube */}
              {msg.youtube && (
                <div
                  onClick={() => {
                    setFloatingVideo({
                      videoId: msg.youtube.videoId,
                      title: msg.youtube.title,
                      thumbnail: msg.youtube.thumbnail,
                    });
                  }}
                  style={{ marginTop: 8, display: "flex", gap: 10, cursor: "pointer", alignItems: "center" }}
                >
                  <img src={msg.youtube.thumbnail} alt="thumb" style={{ width: 140, borderRadius: 8 }} />
                  <div style={{ fontWeight: 700 }}>{msg.youtube.title}</div>
                </div>
              )}

              {/* Reactions */}
              <div style={{ display: "flex", gap: 12, marginTop: 8, fontSize: 14 }}>
                {["like", "heart"].map((type) => {
                  const count = msg.reactions?.filter((r) => r.type === type).length || 0;
                  const reacted = msg.reactions?.some((r) => r.type === type && r.user._id === localStorage.getItem("userId"));
                  const symbol = type === "like" ? "👍" : "❤️";
                  return (
                    <span
                      key={type}
                      style={{
                        cursor: "pointer",
                        fontWeight: reacted ? "700" : "500",
                        userSelect: "none",
                        display: "inline-flex",
                        gap: 6,
                        alignItems: "center",
                      }}
                      onClick={async () => {
                        try {
                          const res = await axios.post(`${API_URL}/messages/${msg._id}/react`, { type }, authHeader);
                          setMessages((prev) => prev.map((m) => (m._id === res.data._id ? res.data : m)));
                        } catch (err) {
                          console.error("Reaction error:", err);
                        }
                      }}
                    >
                      <span style={{ fontSize: 16 }}>{symbol}</span>
                      <span style={{ fontSize: 13, color: "#666" }}>{count}</span>
                    </span>
                  );
                })}
              </div>
            </div>
          ))}
          {/* keep a small ref anchor for scroll-to-bottom */}
          <div ref={messagesEndRef} style={{ height: 4 }} />
        </div>
      </div>

      {/* Input row (compact) */}
      <div style={inputRowStyle}>
        {/* plus menu */}
        <div style={{ position: "relative" }}>
          <button
            onClick={() => setShowMenu(!showMenu)}
            style={iconButtonStyle}
            aria-haspopup="true"
            aria-expanded={showMenu}
          >
            <FaPlus />
          </button>

          {showMenu && (
            <div
              style={{
                position: "absolute",
                bottom: "calc(100% + 10px)",
                left: 0,
                background: "#fff",
                border: "1px solid #eee",
                borderRadius: 10,
                padding: 8,
                boxShadow: "0 8px 24px rgba(16,24,40,0.08)",
                zIndex: 1000,
                display: "flex",
                gap: 8,
              }}
            >
              <label style={{ ...menuItemStyle, cursor: "pointer" }}>
                <FaImage /> <div style={{ fontSize: 12, marginLeft: 6 }}>Upload</div>
                <input ref={fileInputRef} type="file" accept="image/*,video/*" style={{ display: "none" }} onChange={onFileChange} />
              </label>

              <button
                onClick={() => {
                  setPaintOpen(true);
                  setShowMenu(false);
                }}
                style={{ ...menuItemStyle }}
              >
                <FaPaintBrush /> <div style={{ fontSize: 12, marginLeft: 6 }}>Paint</div>
              </button>

              <button
                onClick={() => {
                  setShowYouTubeModal(true);
                  setShowMenu(false);
                }}
                style={{ ...menuItemStyle }}
              >
                <FaYoutube /> <div style={{ fontSize: 12, marginLeft: 6 }}>YouTube</div>
              </button>
            </div>
          )}
        </div>

        {/* emoji */}
        <button onClick={() => setPickerOpen(true)} style={iconButtonStyle}>
          <FaSmile />
        </button>

        {/* textarea */}
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type a message"
          rows={1}
          style={{
            flex: 1,
            padding: "10px 12px",
            borderRadius: 12,
            resize: "none",
            border: "1px solid #e6e6e6",
            minHeight: 44,
            maxHeight: 120,
            fontSize: 15,
            lineHeight: 1.3,
            boxShadow: "inset 0 1px 2px rgba(16,24,40,0.03)",
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              sendMessage();
            }
          }}
        />

        {/* mic */}
        <button
          onClick={toggleRecording}
          style={{
            ...iconButtonStyle,
            background: recording ? "#ff4b4b" : "#fff",
            color: recording ? "#fff" : "#333",
          }}
          title={recording ? "Stop recording" : "Record audio"}
        >
          <FaMicrophone />
        </button>

        {/* send */}
        <button
          onClick={sendMessage}
          style={{
            padding: 10,
            background: "#4e54c8",
            color: "#fff",
            borderRadius: 12,
            border: "none",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
          }}
        >
          <FaPaperPlane />
        </button>
      </div>

      {/* Modals & pickers */}
      <PaintModal isOpen={paintOpen} onClose={() => setPaintOpen(false)} onSend={handlePaintSend} />

      {showYouTubeModal && <YouTubeSearchModal onSelect={sendYouTubeVideo} onClose={() => setShowYouTubeModal(false)} />}

      {pickerOpen && (
        <EmojiGifPicker
          onEmoji={(emoji) => setText((t) => t + emoji)}
          onGif={async (gifObj) => {
            console.log("Sending GIF object:", gifObj);
            await postMessage({ text: "", media: { url: gifObj.url, mimetype: gifObj.mimetype, external: true } });

            // background upload (optional)
            (async () => {
              try {
                const res = await fetch(gifObj.url);
                if (!res.ok) throw new Error("Failed to download gif for upload");
                const blob = await res.blob();
                const ext = (() => {
                  const q = gifObj.url.split("?")[0].toLowerCase();
                  if (q.endsWith(".mp4")) return "mp4";
                  if (q.endsWith(".webp")) return "webp";
                  if (q.endsWith(".gif")) return "gif";
                  return "gif";
                })();
                const file = new File([blob], `gif-${Date.now()}.${ext}`, { type: gifObj.mimetype || "image/gif" });
                await handleFile(file);
              } catch (err) {
                console.warn("Background gif upload failed:", err);
              }
            })();
          }}
          onClose={() => setPickerOpen(false)}
        />
      )}

      {/* Floating player */}
      {floatingVideo && <FloatingPlayer video={floatingVideo} onClose={() => setFloatingVideo(null)} initialPos={floatingPos} />}
    </div>
  );
}

// menu item style
const menuItemStyle = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  padding: 8,
  borderRadius: 8,
  background: "#f6f6f6",
  cursor: "pointer",
};
