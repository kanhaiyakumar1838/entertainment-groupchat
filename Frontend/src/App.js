// frontend/src/App.js
import { Routes, Route, Navigate } from "react-router-dom";
import { useContext } from "react";
import { AuthContext } from "./context/AuthContext";

import Login from "./components/Login";
import Register from "./components/Register";
import GroupList from "./components/GroupList";
import Chat from "./components/Chat";
import Navbar from "./components/Navbar";
import { useLocation } from "react-router-dom";

function App() {
  const { user } = useContext(AuthContext);
  console.log(localStorage.getItem("user"));
    const location = useLocation();
  const showNavbar = !["/login", "/register"].includes(location.pathname);
  //localStorage.clear();
  
 


  return (
     <>
    {showNavbar && <Navbar user={JSON.parse(localStorage.getItem("user"))} />}
    <Routes>
      <Route
        path="/login"
        element={!user ? <Login /> : <Navigate to="/groups" />}
      />
      <Route
        path="/register"
        element={!user ? <Register /> : <Navigate to="/groups" />}
      />
      <Route
        path="/groups"
        element={user ? <GroupList /> : <Navigate to="/login" />}
      />
      <Route
        path="/chat/:groupId"
        element={user ? <Chat /> : <Navigate to="/login" />}
      />
      <Route path="*" element={<Navigate to="/login" />} />
    </Routes>
    </>
  );
}

export default App;
