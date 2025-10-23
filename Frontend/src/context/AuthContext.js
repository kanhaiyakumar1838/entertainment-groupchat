import { createContext, useContext, useState, useEffect } from "react";

// Create Context
export const AuthContext = createContext();

// Context Provider Component
export const AuthContextProvider = ({ children }) => {
  const [user, setUser] = useState(null);

  // Initialize user from localStorage safely
  useEffect(() => {
    if (typeof window !== "undefined") { // ensure we're in the browser
      try {
        const storedUser = localStorage.getItem("user");
        if (storedUser) {
          setUser(JSON.parse(storedUser));
        }
      } catch (err) {
        console.error("Failed to parse user from localStorage:", err);
        setUser(null);
      }
    }
  }, []);

  // Login function
  const login = (data) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
    }
    setUser(data.user);
  };

  // Logout function
  const logout = () => {
    if (typeof window !== "undefined") {
      localStorage.clear();
    }
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook for easy usage
export const useAuth = () => useContext(AuthContext);
