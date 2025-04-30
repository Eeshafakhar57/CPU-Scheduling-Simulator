import React from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import Login from "./components/Login";
import Register from "./components/Register";
import Scheduler from "./components/Scheduler";
import "./App.css"; // Import global styling

function App() {
  return (
    <Router>
      <Routes>
      <Route path="/" element={<Register />} />
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />
        <Route path="/scheduler" element={<Scheduler />} />
      </Routes>
    </Router>
  );
}

export default App;
