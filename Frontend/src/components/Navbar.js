import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaUserCircle } from "react-icons/fa";
import { useAuth } from "../context/AuthContext";
import axios from "axios";

const API_URL = process.env.REACT_APP_API_URL;

const Navbar = () => {
  const navigate = useNavigate();
  const { user, logout, token } = useAuth();
  const [profileOpen, setProfileOpen] = useState(false);
  const [profile, setProfile] = useState(null);

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

  const handleProfileClick = () => {
    fetchProfile();
    setProfileOpen(true);
  };

  const handleProfilePicUpload = async (file) => {
    const fd = new FormData();
    fd.append("file", file);
    try {
      // Upload image to /upload
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
      console.error("Profile picture upload error:", err);
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
              const dropdown = document.getElementById("profile-dropdown");
              dropdown.style.display =
                dropdown.style.display === "block" ? "none" : "block";
            }}
          />

          {/* Dropdown */}
          <div
            id="profile-dropdown"
            style={{
              display: "none",
              position: "absolute",
              right: 0,
              top: "35px",
              background: "#fff",
              color: "#000",
              borderRadius: "8px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
              width: "150px",
              zIndex: 10,
            }}
          >
            <button
              onClick={handleProfileClick}
              style={{
                width: "100%",
                padding: "10px",
                border: "none",
                background: "transparent",
                textAlign: "left",
                cursor: "pointer",
              }}
            >
              My Profile
            </button>
            <button
              onClick={handleLogout}
              style={{
                width: "100%",
                padding: "10px",
                border: "none",
                background: "transparent",
                textAlign: "left",
                cursor: "pointer",
              }}
            >
              Logout
            </button>
          </div>
        </div>
      )}

      {/* Profile Modal */}
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
              <div style={{ marginTop: 10 }}>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleProfilePicUpload(e.target.files[0])}
                />
              </div>
            )}

            <button
              onClick={() => setProfileOpen(false)}
              style={{ marginTop: 12 }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
