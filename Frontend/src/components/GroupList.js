import { useEffect, useState, useContext } from "react";
import axios from "../utils/axiosInstance";
import { AuthContext } from "../context/AuthContext";
import { Link } from "react-router-dom";
import { FaUsers } from "react-icons/fa";

export default function GroupList() {
  const { user } = useContext(AuthContext);
  const [groups, setGroups] = useState([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    const fetchGroups = async () => {
      const res = await axios.get("/groups");
      setGroups(res.data);
    };
    fetchGroups();
  }, []);

  const createGroup = async () => {
    if (!name) return;
    try {
      const res = await axios.post(
        "/groups",
        { name, description },
        { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
      );
      setGroups([...groups, res.data]);
      setName("");
      setDescription("");
    } catch (err) {
      alert(err.response?.data?.message || "Error creating group");
    }
  };

  const joinGroup = async (id) => {
    try {
      await axios.post(
        `/groups/${id}/join`,
        {},
        { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
      );
      alert("Joined group!");
    } catch (err) {
      alert(err.response?.data?.message || "Error joining group");
    }
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Groups</h1>

      {user.role === "owner" && (
        <div style={styles.createGroupCard}>
          <input
            placeholder="Group Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={styles.input}
          />
          <input
            placeholder="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            style={styles.input}
          />
          <button onClick={createGroup} style={styles.createButton}>
            Create Group
          </button>
        </div>
      )}

      <div style={styles.groupList}>
        {groups.map((g) => (
          <div key={g._id} style={styles.groupCard}>
            <Link to={`/chat/${g._id}`} style={styles.link}>
              <div style={styles.groupHeader}>
                {g.image ? (
                  <img src={g.image} alt={g.name} style={styles.groupImage} />
                ) : (
                  <FaUsers size={40} color="#4e54c8" />
                )}
                <h3 style={styles.groupName}>{g.name}</h3>
              </div>
              <p style={styles.groupDesc}>{g.description}</p>
            </Link>
            <button onClick={() => joinGroup(g._id)} style={styles.joinButton}>
              Join
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

const styles = {
  container: {
    padding: "20px",
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
    background: "#f4f4f9",
    minHeight: "100vh",
  },
  title: {
    textAlign: "center",
    color: "#4e54c8",
    marginBottom: "20px",
  },
  createGroupCard: {
    background: "#fff",
    padding: "20px",
    borderRadius: "12px",
    marginBottom: "30px",
    boxShadow: "0 5px 15px rgba(0,0,0,0.1)",
    display: "flex",
    flexDirection: "column",
    maxWidth: "400px",
    marginLeft: "auto",
    marginRight: "auto",
  },
  input: {
    padding: "12px",
    marginBottom: "12px",
    borderRadius: "8px",
    border: "1px solid #ccc",
    fontSize: "14px",
  },
  createButton: {
    padding: "12px",
    borderRadius: "8px",
    border: "none",
    backgroundColor: "#4e54c8",
    color: "#fff",
    fontWeight: "bold",
    cursor: "pointer",
  },
  groupList: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
    gap: "20px",
  },
  groupCard: {
    background: "#fff",
    borderRadius: "12px",
    padding: "15px",
    boxShadow: "0 5px 15px rgba(0,0,0,0.1)",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    transition: "0.3s",
  },
  link: {
    textDecoration: "none",
    color: "#000",
  },
  groupHeader: {
    display: "flex",
    alignItems: "center",
    gap: "15px",
    marginBottom: "10px",
  },
  groupImage: {
    width: "40px",
    height: "40px",
    borderRadius: "50%",
    objectFit: "cover",
  },
  groupName: {
    margin: 0,
    fontSize: "18px",
    color: "#4e54c8",
  },
  groupDesc: {
    fontSize: "14px",
    color: "#555",
    marginBottom: "10px",
  },
  joinButton: {
    padding: "10px",
    borderRadius: "8px",
    border: "none",
    backgroundColor: "#4e54c8",
    color: "#fff",
    fontWeight: "bold",
    cursor: "pointer",
  },
};
