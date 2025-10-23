import React from "react";
import { useNavigate } from "react-router-dom";
import { FaUserCircle } from "react-icons/fa";
import { useAuth } from "../context/AuthContext"; // import your auth hook

const Navbar = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth(); // get logout function from context

  const handleLogout = () => {
    logout();           // update context + clear localStorage
    navigate("/login"); // redirect to login page
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
              onClick={() => navigate("/profile")}
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
  );
};

export default Navbar;
