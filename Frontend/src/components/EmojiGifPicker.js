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
              // inside EmojiGifPicker, update the GIF click handler to this
{gifs.map((gif) => (
  <div
    key={gif.id}
    onClick={() => {
      // Prefer direct GIF file when available, else choose a suitable animated fallback.
      // Candidate fields (common on Giphy objects):
      // - gif.images.original: usually large (may be .gif or .webp)
      // - gif.images.original.url
      // - gif.images.fixed_height: often .gif or .mp4
      // - gif.images.fixed_height.url
      // - gif.images.downsized or downsized_medium -> usually .gif
      // We'll pick the best available direct file and determine its mimetype.

      const pick = (fields) => {
        for (const f of fields) {
          const val = f && f.url ? f.url : null;
          if (val) return val;
        }
        return null;
      };

      // order of preference: downsized (gif), original (gif/webp), fixed_height (gif/mp4), preview.mp4 (video)
      let url =
        pick([gif.images.downsized, gif.images.downsized_medium]) ||
        pick([gif.images.original]) ||
        pick([gif.images.fixed_height]) ||
        pick([gif.images.fixed_width]) ||
        pick([gif.images.preview_gif, gif.images.preview]) ||
        gif.url || // fallback (page link)
        null;

      // If somehow we still have a giphy page link (like https://giphy.com/gifs/...), try to extract id
      // and build original gif url from image fields above; if nothing, just use gif.images.original.url
      if (!url && gif.images && gif.images.original) {
        url = gif.images.original.url;
      }

      // Determine mimetype from extension or common patterns
      let mimetype = "image/gif";
      if (!url) {
        console.warn("No gif url found for", gif);
        return;
      }
      const lower = url.split("?")[0].toLowerCase();
      if (lower.endsWith(".mp4")) mimetype = "video/mp4";
      else if (lower.endsWith(".webm")) mimetype = "video/webm";
      else if (lower.endsWith(".webp")) mimetype = "image/webp";
      else if (lower.endsWith(".gif")) mimetype = "image/gif";
      else {
        // For CDN urls that don't have extension, check typical substrings
        if (url.includes(".mp4") || url.includes("media.mp4")) mimetype = "video/mp4";
        else if (url.includes("webp")) mimetype = "image/webp";
        else if (url.includes("giphy.com/media") && url.includes("giphy.gif")) mimetype = "image/gif";
        else mimetype = "image/gif"; // safe default
      }

      // send the structured payload to parent
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
      src={gif.images.fixed_height?.url || gif.images.original?.url}
      alt="gif"
      style={{ width: "100%", height: "100%", objectFit: "cover" }}
    />
  </div>
))}


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
