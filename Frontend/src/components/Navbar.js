import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FaUserCircle } from "react-icons/fa";
import { useAuth } from "../context/AuthContext"; // import your auth hook
import axios from "axios";


const Navbar = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth(); // get logout function from context
  const [profileOpen, setProfileOpen] = useState(false);
  const [profile, setProfile] = useState(null);
  const API_URL = process.env.REACT_APP_API_URL;
  const authHeader = {
    headers: { Authorization: `Bearer ${user?.token}` } // assuming your context stores token
  };

  const fetchProfile = async () => {
    try {
      const res = await axios.get(`${API_URL}/user/me`, authHeader);
      setProfile(res.data);
    } catch (err) {
      console.error("Error fetching profile:", err);
    }
  };

  const handleLogout = () => {
    logout();           // update context + clear localStorage
    navigate("/login"); // redirect to login page
  };

  return (
    <>
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
          style={{
            fontSize: "20px",
            fontWeight: "bold",
            cursor: "pointer",
          }}
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
                onClick={() => {
                  fetchProfile();
                  setProfileOpen(true);
                  document.getElementById("profile-dropdown").style.display = "none";
                }}
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
      </nav>

      {/* Profile Modal */}
      {profileOpen && profile && (
        <div
          style={{
            position: "fixed",
            top: 0, left: 0, right: 0, bottom: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 100
          }}
        >
          <div style={{ background: "#fff", padding: 20, borderRadius: 12, width: 320 }}>
            <h3>{profile.username}</h3>
            <img
              src={profile.profilePic || "https://via.placeholder.com/120"}
              alt="Profile"
              style={{ width: 120, height: 120, borderRadius: "50%", objectFit: "cover" }}
            />
            <p>Email: {profile.email}</p>
            <p>Phone: {profile.phone}</p>
            <p>Age: {profile.age}</p>

            {!profile.profilePic && (
              <input
                type="file"
                accept="image/*"
                onChange={async (e) => {
                  const file = e.target.files[0];
                  const fd = new FormData();
                  fd.append("file", file);
                  const uploadRes = await axios.post(`${API_URL}/upload`, fd, {
                    headers: { Authorization: `Bearer ${user.token}`, "Content-Type": "multipart/form-data" }
                  });
                  const picUrl = uploadRes.data.url;
                  const updated = await axios.post(`${API_URL}/user/me/profile-pic`, { profilePic: picUrl }, authHeader);
                  setProfile(updated.data);
                }}
              />
            )}

            <button onClick={() => setProfileOpen(false)} style={{ marginTop: 12 }}>
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
};


export default Navbar;
