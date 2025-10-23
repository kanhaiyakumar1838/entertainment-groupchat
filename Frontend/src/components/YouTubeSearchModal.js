// src/components/YouTubeSearchModal.js
import React, { useState } from "react";
import axios from "axios";

export default function YouTubeSearchModal({ onSelect, onClose }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);

  const handleSearch = async () => {
    if (!query) return;

    // ✅ Debug log for API key
    console.log("🔑 Loaded API Key:", process.env.REACT_APP_YOUTUBE_API_KEY);

    try {
      const res = await axios.get("https://www.googleapis.com/youtube/v3/search", {
        params: {
          part: "snippet",
          q: query,
          key: process.env.REACT_APP_YOUTUBE_API_KEY,
          maxResults: 6,
          type: "video",
        },
      });

      console.log("✅ YouTube API Response:", res.data);
      setResults(res.data.items || []);
    } catch (err) {
      console.error("❌ YouTube search error:", err);
      if (err.response) {
        console.error("➡️ API Error Response:", err.response.data);
      }
      alert("Failed to fetch results. Check your API key or restrictions.");
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50">
      <div className="bg-white p-5 rounded-2xl w-[90%] md:w-[600px] max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-3 text-center">Search YouTube Video</h2>

        <div className="flex gap-2 mb-4">
          <input
            className="flex-1 border p-2 rounded-lg"
            placeholder="Search videos..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button
            onClick={handleSearch}
            className="bg-red-500 text-white px-3 py-2 rounded-lg hover:bg-red-600"
          >
            Search
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {results.map((video) => (
            <div
              key={video.id.videoId}
              className="border rounded-lg overflow-hidden cursor-pointer hover:shadow-lg transition"
              onClick={() =>
                onSelect({
                  url: `https://www.youtube.com/watch?v=${video.id.videoId}`,
                  title: video.snippet.title,
                  thumbnail: video.snippet.thumbnails.medium.url,
                })
              }
            >
              <img
                src={video.snippet.thumbnails.medium.url}
                alt={video.snippet.title}
                className="w-full h-40 object-cover"
              />
              <p className="p-2 text-sm font-medium">{video.snippet.title}</p>
            </div>
          ))}
        </div>

        <button
          onClick={onClose}
          className="mt-5 bg-gray-600 text-white w-full py-2 rounded-lg hover:bg-gray-700"
        >
          Close
        </button>
      </div>
    </div>
  );
}
