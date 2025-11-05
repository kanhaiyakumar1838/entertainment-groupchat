import React, { useState, useEffect } from "react";
import EmojiPicker from "emoji-picker-react";
import { GiphyFetch } from "@giphy/js-fetch-api";

const gf = new GiphyFetch(process.env.REACT_APP_GIPHY_KEY); // from .env

export default function EmojiGifPicker({ onEmoji, onGif, onClose }) {
  const [mode, setMode] = useState("emoji"); // emoji | gif
  const [gifs, setGifs] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");

  // fetch trending initially or search on input
  const handleSearch = async (term) => {
    setSearchTerm(term);
    try {
      const { data } = term
        ? await gf.search(term, { limit: 20 })
        : await gf.trending({ limit: 20 });
      setGifs(data || []);
    } catch (err) {
      console.error("Giphy fetch error:", err);
      setGifs([]);
    }
  };

  // fetch trending GIFs when switching to GIF tab
  useEffect(() => {
    if (mode === "gif" && gifs.length === 0) {
      handleSearch("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  // helper to pick the first available .url from list of image variants
  const pickUrl = (fields) => {
    for (const f of fields) {
      if (!f) continue;
      const val = f.url || f.mp4 || f.webp || f.gif || null;
      if (val) return val;
    }
    return null;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50">
      <div className="bg-white rounded-2xl p-4 w-[90%] md:w-[500px] max-h-[80vh] overflow-y-auto">
        {/* Header Tabs */}
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

        {/* Emoji Picker */}
        {mode === "emoji" && (
          <EmojiPicker
            onEmojiClick={(emoji) => {
              onEmoji(emoji.emoji);
              onClose();
            }}
          />
        )}

        {/* GIF Picker */}
        {mode === "gif" && (
          <div>
            <input
              className="border p-2 rounded w-full mb-3"
              placeholder="Search GIFs..."
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
            />

            {/* GIF grid */}
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
                // choose best direct file url
                const url =
                  pickUrl([
                    gif.images?.downsized,
                    gif.images?.downsized_medium,
                    gif.images?.original,
                    gif.images?.fixed_height,
                    gif.images?.fixed_width,
                    gif.images?.preview_gif,
                    gif.images?.preview,
                  ]) || gif.url || null;

                // determine mimetype based on url
                let mimetype = "image/gif";
                if (url) {
                  const lower = url.split("?")[0].toLowerCase();
                  if (lower.endsWith(".mp4")) mimetype = "video/mp4";
                  else if (lower.endsWith(".webm")) mimetype = "video/webm";
                  else if (lower.endsWith(".webp")) mimetype = "image/webp";
                  else if (lower.endsWith(".gif")) mimetype = "image/gif";
                  else {
                    // try to sniff common patterns
                    if (url.includes(".mp4") || url.includes("media.mp4")) mimetype = "video/mp4";
                    else if (url.includes("webp")) mimetype = "image/webp";
                    else mimetype = "image/gif";
                  }
                }

                return (
                  <div
                    key={gif.id}
                    onClick={() => {
                      if (!url) {
                        console.warn("No gif url found for", gif);
                        return;
                      }
                      onGif({ url, mimetype });
                      onClose();
                    }}
                    style={{
                      cursor: "pointer",
                      borderRadius: 8,
                      overflow: "hidden",
                      transition: "transform 0.2s",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.05)")}
                    onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
                  >
                    <img
                      src={gif.images?.fixed_height?.url || gif.images?.original?.url}
                      alt={gif.title || "gif"}
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Close Button */}
        <button
          onClick={onClose}
          className="mt-4 bg-gray-600 text-white w-full py-2 rounded-lg"
        >
          Close
        </button>
      </div>
    </div>
  );
}
