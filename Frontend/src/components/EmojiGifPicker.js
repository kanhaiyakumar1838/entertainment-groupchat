import React, { useState } from "react";
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
    const { data } = term
      ? await gf.search(term, { limit: 20 })
      : await gf.trending({ limit: 20 });
    setGifs(data);
  };

  // fetch trending GIFs when switching to GIF tab
  React.useEffect(() => {
    if (mode === "gif" && gifs.length === 0) {
      handleSearch("");
    }
  }, [mode]);

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
              {gifs.map((gif) => (
                <div
                  key={gif.id}
                  onClick={() => {
                    // Pick a reliable GIF URL for <img>
      let gifUrl = gif.images.fixed_height.url;

      // Fallback: if it's not a .gif, use the original GIF URL
                    if (!gifUrl.endsWith(".gif")) {
                    gifUrl = gif.images.original.url;
                    }
                    onGif(gifUrl);
                    onClose();
                  }}
                  style={{
                    cursor: "pointer",
                    borderRadius: 8,
                    overflow: "hidden",
                    transition: "transform 0.2s",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.transform = "scale(1.05)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.transform = "scale(1)")
                  }
                >
                  <img
                    src={gif.images.fixed_height.url}
                    alt="gif"
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                </div>
              ))}
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
