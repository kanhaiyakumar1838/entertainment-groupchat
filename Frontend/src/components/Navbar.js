// src/components/Navbar.js
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaUserCircle } from "react-icons/fa";
import { useAuth } from "../context/AuthContext";
import axios from "axios";

const Navbar = () => {
  const navigate = useNavigate();
  const { user, logout, token } = useAuth(); // get user info + auth token
  const [profileOpen, setProfileOpen] = useState(false);
  const [profile, setProfile] = useState(null);

  const API_URL = process.env.REACT_APP_API_URL;

  const authHeader = { headers: { Authorization: `Bearer ${token}` } };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const fetchProfile = async () => {
    try {
      const res = await axios.get(`${API_URL}/user/me`, authHeader);
      setProfile(res.data);
    } catch (err) {
      console.error("Error fetching profile:", err);
    }
  };

  const handleProfilePicUpload = async (file) => {
    const fd = new FormData();
    fd.append("file", file);
    try {
      // Upload file
      const uploadRes = await axios.post(`${API_URL}/upload`, fd, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "multipart/form-data" },
      });
      const picUrl = uploadRes.data.url;

      // Update user profile
      const updated = await axios.post(
        `${API_URL}/user/me/profile-pic`,
        { profilePic: picUrl },
        authHeader
      );
      setProfile(updated.data);
    } catch (err) {
      console.error("Error uploading profile picture:", err);
    }
  };

  return (
    <nav
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "10px 20px",
        backgroundColor: "#1f2937",
        color: "white",
      }}
    >
      <div
        style={{ fontSize: "20px", fontWeight: "bold", cursor: "pointer" }}
        onClick={() => navigate("/")}
      >
        Chat Group
      </div>

      {user && (
        <div style={{ position: "relative" }}>
          <FaUserCircle
            size={28}
            style={{ cursor: "pointer" }}
            onClick={() => {
              fetchProfile();
              setProfileOpen(!profileOpen);
            }}
          />

          {profileOpen && profile && (
            <div
              style={{
                position: "fixed",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: "rgba(0,0,0,0.5)",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                zIndex: 100,
              }}
            >
              <div
                style={{
                  background: "#fff",
                  padding: 20,
                  borderRadius: 12,
                  width: 320,
                  textAlign: "center",
                }}
              >
                <h3>{profile.username}</h3>
                <img
                  src={profile.profilePic || "https://via.placeholder.com/120"}
                  alt="Profile"
                  style={{
                    width: 120,
                    height: 120,
                    borderRadius: "50%",
                    objectFit: "cover",
                    marginBottom: 10,
                  }}
                />
                <p>Email: {profile.email}</p>
                <p>Phone: {profile.phone}</p>
                <p>Age: {profile.age}</p>

                {!profile.profilePic && (
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) =>
                      e.target.files[0] && handleProfilePicUpload(e.target.files[0])
                    }
                  />
                )}

                <button
                  onClick={() => setProfileOpen(false)}
                  style={{
                    marginTop: 12,
                    padding: "8px 16px",
                    borderRadius: 6,
                    border: "none",
                    background: "#4e54c8",
                    color: "#fff",
                    cursor: "pointer",
                  }}
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {user && (
        <button
          onClick={handleLogout}
          style={{
            marginLeft: 12,
            padding: "6px 12px",
            borderRadius: 6,
            border: "none",
            cursor: "pointer",
            background: "#ef4444",
            color: "#fff",
          }}
        >
          Logout
        </button>
      )}
    </nav>
  );
};

export default Navbar;
