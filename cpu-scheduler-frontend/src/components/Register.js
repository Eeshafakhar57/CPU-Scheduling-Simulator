import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "./Auth.css"; // Import styles

const Register = () => {
  const [user, setUser] = useState({ username: "", email: "", password: "" });
  const navigate = useNavigate();

  const handleChange = (e) => {
    setUser({ ...user, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post("http://localhost:5000/register", user);
  
      if (res.data) {  // ✅ Ensure response data exists
        alert(res.data.message || "✅ Registration successful! Please log in.");
        navigate("/login"); // Redirect to login after successful registration
      } else {
        alert("❌ Unexpected response format from server.");
      }
    } catch (err) {
      console.error("❌ Registration Error:", err);
      alert(err.response?.data?.message || "❌ Registration failed due to server error.");
    }
  };
  

  return (
    <div className="auth-container">
      <h2>Register</h2>
      <form onSubmit={handleSubmit}>
        <input type="text" name="username" placeholder="Username" onChange={handleChange} required />
        <input type="email" name="email" placeholder="Email" onChange={handleChange} required />
        <input type="password" name="password" placeholder="Password" onChange={handleChange} required />
        <button type="submit">Register</button>
      </form>
      <p>Already have an account? <a href="/login">Login here</a></p>
    </div>
  );
};

export default Register;
