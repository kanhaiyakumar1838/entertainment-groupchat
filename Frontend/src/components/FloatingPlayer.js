// frontend/src/components/FloatingPlayer.js
import React, { useEffect, useRef, useState } from "react";

/*
Props:
- video: { videoId, title, thumbnail } or null
- onClose: ()=>void
- initialPos: { x, y } optional
*/
export default function FloatingPlayer({ video, onClose, initialPos = { x: 20, y: 80 } }) {
  const iframeRef = useRef(null);
  const containerRef = useRef(null);
  const dragging = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });

  const [pos, setPos] = useState(initialPos);
  const [minimized, setMinimized] = useState(false);
  const [playing, setPlaying] = useState(true);

  useEffect(() => {
    // autoplay when video changes
    setPlaying(true);
    setMinimized(false);
  }, [video]);

  useEffect(() => {
    function onMouseMove(e) {
      if (!dragging.current) return;
      const clientX = e.clientX ?? (e.touches && e.touches[0].clientX);
      const clientY = e.clientY ?? (e.touches && e.touches[0].clientY);
      if (clientX == null) return;
      const x = clientX - dragOffset.current.x;
      const y = clientY - dragOffset.current.y;
      // keep inside viewport
      const w = window.innerWidth;
      const h = window.innerHeight;
      const clampedX = Math.max(8, Math.min(w - 320, x));
      const clampedY = Math.max(8, Math.min(h - 120, y));
      setPos({ x: clampedX, y: clampedY });
    }
    function onMouseUp() {
      dragging.current = false;
    }
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    window.addEventListener("touchmove", onMouseMove, { passive: false });
    window.addEventListener("touchend", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      window.removeEventListener("touchmove", onMouseMove);
      window.removeEventListener("touchend", onMouseUp);
    };
  }, []);

  if (!video) return null;

  const embedUrl = `https://www.youtube.com/embed/${video.videoId}?autoplay=1&mute=0&enablejsapi=1&rel=0`;

  const onDragStart = (e) => {
    dragging.current = true;
    const clientX = e.clientX ?? (e.touches && e.touches[0].clientX);
    const clientY = e.clientY ?? (e.touches && e.touches[0].clientY);
    const rect = containerRef.current.getBoundingClientRect();
    dragOffset.current = { x: clientX - rect.left, y: clientY - rect.top };
    e.preventDefault?.();
  };

  const toggleMinimize = () => {
    setMinimized((m) => !m);
  };

  // Post message to iframe to control play/pause using YouTube IFrame API
  const postToPlayer = (command) => {
    const iframe = iframeRef.current;
    if (!iframe || !iframe.contentWindow) return;
    iframe.contentWindow.postMessage(
      JSON.stringify({ event: "command", func: command, args: [] }),
      "*"
    );
  };

  const handlePlayPause = () => {
    if (playing) {
      postToPlayer("pauseVideo");
      setPlaying(false);
    } else {
      postToPlayer("playVideo");
      setPlaying(true);
    }
  };

  const styleContainer = {
    position: "fixed",
    left: pos.x,
    top: pos.y,
    width: minimized ? 200 : 320,
    height: minimized ? 56 : 180,
    background: "#fff",
    borderRadius: 8,
    boxShadow: "0 8px 30px rgba(0,0,0,0.15)",
    zIndex: 2000,
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
    userSelect: "none",
  };

  const headerStyle = {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "6px 8px",
    cursor: "grab",
    background: "#fafafa",
    borderBottom: minimized ? "none" : "1px solid #eee",
  };

  return (
    <div
      ref={containerRef}
      style={styleContainer}
      role="dialog"
      aria-label={`Floating player for ${video.title}`}
    >
      <div
        style={headerStyle}
        onMouseDown={onDragStart}
        onTouchStart={onDragStart}
      >
        <div style={{ flex: 1, fontSize: 13, fontWeight: 600 }}>
          {video.title?.slice(0, 30) || "YouTube"}
        </div>

        <div style={{ display: "flex", gap: 6 }}>
          <button
            onClick={handlePlayPause}
            style={{
              padding: "6px 8px",
              borderRadius: 6,
              border: "none",
              background: "#f1f1f1",
              cursor: "pointer",
            }}
            aria-label={playing ? "Pause" : "Play"}
          >
            {playing ? "⏸" : "▶"}
          </button>

          <button
            onClick={toggleMinimize}
            style={{
              padding: "6px 8px",
              borderRadius: 6,
              border: "none",
              background: "#f1f1f1",
              cursor: "pointer",
            }}
            aria-label={minimized ? "Restore" : "Minimize"}
          >
            {minimized ? "⬆" : "—"}
          </button>

          <button
            onClick={() => {
              // stop playback before closing
              postToPlayer("stopVideo");
              onClose && onClose();
            }}
            style={{
              padding: "6px 8px",
              borderRadius: 6,
              border: "none",
              background: "#ff5f5f",
              color: "#fff",
              cursor: "pointer",
            }}
            aria-label="Close"
          >
            ✕
          </button>
        </div>
      </div>

      {!minimized && (
        <div style={{ flex: 1, display: "flex", alignItems: "stretch" }}>
          <iframe
            ref={iframeRef}
            title={video.title || "YouTube video"}
            src={embedUrl}
            allow="autoplay; encrypted-media; picture-in-picture"
            frameBorder="0"
            style={{ width: "100%", height: "100%" }}
          />
        </div>
      )}

      {minimized && (
        <div style={{ display: "flex", alignItems: "center", padding: "8px" }}>
          <img
            src={video.thumbnail}
            alt="thumb"
            style={{ width: 40, height: 40, borderRadius: 4, objectFit: "cover" }}
          />
          <div style={{ marginLeft: 8, fontSize: 12, flex: 1 }}>
            {video.title?.slice(0, 40)}
          </div>
        </div>
      )}
    </div>
  );
}
