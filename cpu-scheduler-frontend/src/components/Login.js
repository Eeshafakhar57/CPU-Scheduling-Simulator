import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "./Auth.css"; // Import styles

const Login = () => {
  const [credentials, setCredentials] = useState({ email: "", password: "" });
  const navigate = useNavigate();

  const handleChange = (e) => {
    setCredentials({ ...credentials, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post("http://localhost:5000/login", credentials);
  
      if (res.data) {  // ✅ Check if response data exists
        localStorage.setItem("user", JSON.stringify(res.data.user)); // Save user info
        localStorage.setItem("token", res.data.token); // Save JWT token
        alert(res.data.message || "✅ Login successful!");
        navigate("/scheduler"); // Redirect to scheduler after login
      } else {
        alert("❌ Unexpected response format from server.");
      }
    } catch (err) {
      console.error("❌ Login Error:", err);
      alert(err.response?.data?.message || "❌ Login failed due to server error.");
    }
  };

  return (
    <div className="auth-container">
      <h2>Login</h2>
      <form onSubmit={handleSubmit}>
        <input type="email" name="email" placeholder="Email" onChange={handleChange} required />
        <input type="password" name="password" placeholder="Password" onChange={handleChange} required />
        <button type="submit">Login</button>
      </form>
      <p>Don't have an account? <a href="/register">Register here</a></p>
    </div>
  );
};

export default Login;
