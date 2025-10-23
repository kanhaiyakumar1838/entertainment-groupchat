import { useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await axios.post("http://localhost:5000/api/auth/login", {
        email,
        password,
      });
      login(res.data);
      navigate("/"); // redirect to home/chat after login
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h2 style={styles.title}>Welcome Back</h2>
        <p style={styles.subtitle}>Login to access your chats</p>
        <form onSubmit={handleSubmit} style={styles.form}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={styles.input}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={styles.input}
          />
          <button type="submit" style={styles.loginButton} disabled={loading}>
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>
        <div style={styles.divider}>OR</div>
        <button
          style={styles.registerButton}
          onClick={() => navigate("/Register")}
        >
          New Registration
        </button>
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    height: "100vh",
    background: "linear-gradient(to right, #4e54c8, #8f94fb)",
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
  },
  card: {
    background: "#fff",
    padding: "40px",
    borderRadius: "12px",
    boxShadow: "0 10px 25px rgba(0,0,0,0.2)",
    width: "350px",
    textAlign: "center",
  },
  title: {
    marginBottom: "10px",
    color: "#333",
  },
  subtitle: {
    marginBottom: "30px",
    color: "#666",
    fontSize: "14px",
  },
  form: {
    display: "flex",
    flexDirection: "column",
  },
  input: {
    padding: "12px",
    marginBottom: "15px",
    borderRadius: "8px",
    border: "1px solid #ccc",
    fontSize: "14px",
  },
  loginButton: {
    padding: "12px",
    borderRadius: "8px",
    border: "none",
    backgroundColor: "#4e54c8",
    color: "#fff",
    fontWeight: "bold",
    cursor: "pointer",
    marginBottom: "15px",
    transition: "0.3s",
  },
  divider: {
    margin: "10px 0",
    color: "#888",
    fontSize: "14px",
  },
  registerButton: {
    padding: "12px",
    borderRadius: "8px",
    border: "1px solid #4e54c8",
    backgroundColor: "#fff",
    color: "#4e54c8",
    fontWeight: "bold",
    cursor: "pointer",
    transition: "0.3s",
  },
};
