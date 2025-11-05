// frontend/src/components/EmojiGifPicker.js
import React, { useEffect, useRef, useState, useCallback } from "react";
import EmojiPicker from "emoji-picker-react";
import { GiphyFetch } from "@giphy/js-fetch-api";

const gf = new GiphyFetch(process.env.REACT_APP_GIPHY_KEY);

function useDebouncedValue(value, delay = 300) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setV(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return v;
}

export default function EmojiGifPicker({ onEmoji, onGif, onClose }) {
  const [mode, setMode] = useState("emoji"); // emoji | gif
  const [gifs, setGifs] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedTerm = useDebouncedValue(searchTerm, 300);
  const [loading, setLoading] = useState(false);
  const abortRef = useRef(null);

  const handleSearch = useCallback(
    async (term) => {
      setLoading(true);
      // cancel previous
      if (abortRef.current) {
        try { abortRef.current.abort(); } catch (_) {}
      }
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const { data } =
          (term
            ? await gf.search(term, { limit: 20, signal: controller.signal })
            : await gf.trending({ limit: 20, signal: controller.signal })) || {};
        setGifs(data || []);
      } catch (err) {
        if (err?.name === "AbortError") {
          // expected when canceled
        } else {
          console.error("Giphy fetch error:", err);
          setGifs([]);
        }
      } finally {
        setLoading(false);
        abortRef.current = null;
      }
    },
    [setGifs]
  );

  // trigger search when mode or debouncedTerm changes
  useEffect(() => {
    if (mode === "gif") handleSearch(debouncedTerm);
  }, [mode, debouncedTerm, handleSearch]);

  useEffect(() => {
    return () => {
      if (abortRef.current) try { abortRef.current.abort(); } catch (_) {}
    };
  }, []);

  const pickUrl = (gif) => {
    // Prefer a small animated preview for grid thumbnails (fast)
    // fallback order: preview_gif, fixed_width_small, fixed_width, original
    return (
      gif.images?.preview_gif?.url ||
      gif.images?.fixed_width_small?.url ||
      gif.images?.fixed_width?.url ||
      gif.images?.downsized?.url ||
      gif.images?.original?.url ||
      null
    );
  };

  // choose a good direct file and mimetype for sending
  const pickBestDirect = (gif) => {
    // order of preference for sending: downsized (gif), original (gif/webp), fixed_height (gif/mp4), preview_mp4
    const candidates = [
      gif.images?.downsized,
      gif.images?.original,
      gif.images?.fixed_height,
      gif.images?.preview_gif,
      gif.images?.preview,
      gif.images?.fixed_width_small,
    ];
    for (const c of candidates) {
      if (!c) continue;
      const url = c.url || c.mp4 || c.webp || null;
      if (url) {
        let mimetype = "image/gif";
        const lower = url.split("?")[0].toLowerCase();
        if (lower.endsWith(".mp4")) mimetype = "video/mp4";
        else if (lower.endsWith(".webm")) mimetype = "video/webm";
        else if (lower.endsWith(".webp")) mimetype = "image/webp";
        else if (lower.endsWith(".gif")) mimetype = "image/gif";
        else {
          // sniff common patterns
          if (url.includes(".mp4") || url.includes("media.mp4")) mimetype = "video/mp4";
          else if (url.includes("webp")) mimetype = "image/webp";
          else mimetype = "image/gif";
        }
        return { url, mimetype };
      }
    }
    // as ultimate fallback
    return { url: gif.url || null, mimetype: "image/gif" };
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50">
      <div className="bg-white rounded-2xl p-4 w-[90%] md:w-[500px] max-h-[80vh] overflow-y-auto">
        <div className="flex justify-around mb-3">
          <button
            onClick={() => setMode("emoji")}
            className={`px-3 py-1 rounded ${mode === "emoji" ? "bg-gray-200 font-bold" : ""}`}
          >
            😀 Emoji
          </button>
          <button
            onClick={() => setMode("gif")}
            className={`px-3 py-1 rounded ${mode === "gif" ? "bg-gray-200 font-bold" : ""}`}
          >
            🎞️ GIF
          </button>
        </div>

        {mode === "emoji" && (
          <EmojiPicker
            onEmojiClick={(emoji) => {
              onEmoji(emoji.emoji);
              onClose();
            }}
          />
        )}

        {mode === "gif" && (
          <div>
            <input
              className="border p-2 rounded w-full mb-3"
              placeholder="Search GIFs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />

            {loading && <div style={{ padding: 8 }}>Loading GIFs…</div>}

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))",
                gap: "8px",
                maxHeight: "300px",
                overflowY: "auto",
              }}
            >
              {gifs.map((gif) => {
                const thumb = pickUrl(gif);
                const best = pickBestDirect(gif);
                return (
                  <div
                    key={gif.id}
                    onClick={() => {
                      if (!best.url) {
                        console.warn("no direct gif url", gif);
                        return;
                      }
                      onGif({ url: best.url, mimetype: best.mimetype });
                      onClose();
                    }}
                    style={{
                      cursor: "pointer",
                      borderRadius: 8,
                      overflow: "hidden",
                      transition: "transform 0.15s",
                      height: 100,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.05)")}
                    onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
                  >
                    {thumb ? (
                      <img
                        src={thumb}
                        alt={gif.title || "gif"}
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                        loading="lazy"
                      />
                    ) : (
                      <div style={{ padding: 8, fontSize: 12 }}>No preview</div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <button onClick={onClose} className="mt-4 bg-gray-600 text-white w-full py-2 rounded-lg">
          Close
        </button>
      </div>
    </div>
  );
}
