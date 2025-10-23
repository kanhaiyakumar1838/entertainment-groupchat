// frontend/src/components/PaintModal.js
import React, { useRef, useState, useEffect } from "react";

export default function PaintModal({ isOpen, onClose, onSend }) {
  const canvasRef = useRef(null);
  const [ctx, setCtx] = useState(null);
  const [color, setColor] = useState("#ff0066");
  const [size, setSize] = useState(4);
  const [bg, setBg] = useState("#ffffff");
  const [isDrawing, setIsDrawing] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const canvas = canvasRef.current;
    canvas.width = 800;
    canvas.height = 600;
    const _ctx = canvas.getContext("2d");
    _ctx.fillStyle = bg;
    _ctx.fillRect(0, 0, canvas.width, canvas.height);
    _ctx.lineJoin = "round";
    _ctx.lineCap = "round";
    setCtx(_ctx);
  }, [isOpen, bg]);

  const start = (e) => {
    if (!ctx) return;
    setIsDrawing(true);
    ctx.beginPath();
    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.clientX || e.touches[0].clientX) - rect.left;
    const y = (e.clientY || e.touches[0].clientY) - rect.top;
    ctx.moveTo(x, y);
  };

  const draw = (e) => {
    if (!isDrawing || !ctx) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.clientX || e.touches[0].clientX) - rect.left;
    const y = (e.clientY || e.touches[0].clientY) - rect.top;
    ctx.strokeStyle = color;
    ctx.lineWidth = size;
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stop = () => {
    if (!ctx) return;
    setIsDrawing(false);
    ctx.closePath();
  };

  const clear = () => {
    if (!ctx) return;
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);
  };

  const exportImage = () => {
    const dataUrl = canvasRef.current.toDataURL("image/png");
    return dataUrl;
  };

  const handleSend = () => {
    const dataUrl = exportImage();
    onSend(dataUrl); // parent will convert to blob and upload
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div style={modalStyle.backdrop}>
      <div style={modalStyle.modal}>
        <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
          <label>Color: <input type="color" value={color} onChange={(e)=>setColor(e.target.value)} /></label>
          <label>Brush: <input type="range" min="1" max="40" value={size} onChange={(e)=>setSize(e.target.value)} /></label>
          <label>BG: <input type="color" value={bg} onChange={(e)=>setBg(e.target.value)} /></label>
          <button onClick={clear}>Clear</button>
          <button onClick={()=>{ ctx && (ctx.globalCompositeOperation = "destination-over"); ctx.fillStyle = bg; ctx.fillRect(0,0,canvasRef.current.width,canvasRef.current.height); ctx.globalCompositeOperation = "source-over"; }}>Apply BG</button>
        </div>

        <div
          style={{ border: "1px solid #ccc", width: 800, height: 600, touchAction: "none" }}
          onMouseDown={start}
          onMouseMove={draw}
          onMouseUp={stop}
          onMouseLeave={stop}
          onTouchStart={start}
          onTouchMove={draw}
          onTouchEnd={stop}
        >
          <canvas ref={canvasRef} style={{ width: "100%", height: "100%" }} />
        </div>

        <div style={{ marginTop: 10, display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button onClick={onClose}>Cancel</button>
          <button onClick={handleSend} style={{ background: "#4e54c8", color: "#fff", padding: "8px 12px" }}>Send</button>
        </div>
      </div>
    </div>
  );
}

const modalStyle = {
  backdrop: {
    position: "fixed",
    left: 0, right: 0, top: 0, bottom: 0,
    background: "rgba(0,0,0,0.5)",
    display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000
  },
  modal: {
    background: "#fff",
    padding: 12,
    borderRadius: 8,
    maxWidth: "95%",
    maxHeight: "95%",
    overflow: "auto"
  }
};
