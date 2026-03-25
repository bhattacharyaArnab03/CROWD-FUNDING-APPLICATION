import { useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { AuthContext } from "../context/AuthContext";
import "./Auth.css";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [isForgot, setIsForgot] = useState(false);
  const [message, setMessage] = useState("");
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();

    const email = e.target[0].value;
    const password = e.target[1].value;

    try {
      const res = await axios.post(`${API_BASE}/api/auth/login`, { email, password });
      login(res.data);
      if (res.data.role === "admin") {
        navigate("/admin");
      } else {
        navigate("/dashboard");
      }
    } catch (err) {
      alert(err.response?.data?.message || "Invalid credentials");
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-left">
        <h1>CrowdFundX</h1>
        <p>Empowering ideas. Connecting communities.</p>
      </div>

      <div className="auth-right">
        <div className="auth-card">

          <div className="auth-toggle">
            <button
              className={isLogin ? "active" : ""}
              onClick={() => setIsLogin(true)}
            >
              Login
            </button>
            <button
              className={!isLogin ? "active" : ""}
              onClick={() => setIsLogin(false)}
            >
              Register
            </button>
          </div>

          <div className="auth-message">{message}</div>
          {isLogin ? (
            isForgot ? (
              <form
                className="auth-form"
                onSubmit={async (e) => {
                  e.preventDefault();
                  const email = e.target[0].value;
                  const newPassword = e.target[1].value;

                  try {
                    await axios.post(`${API_BASE}/api/auth/forgot-password`, { email, newPassword });
                    setMessage("Password has been reset. Please login.");
                    setIsForgot(false);
                  } catch (err) {
                    setMessage(err.response?.data?.message || "Password reset failed");
                  }
                }}
              >
                <h2>Forgot Password</h2>
                <input type="email" placeholder="Email" required />
                <input type="password" placeholder="New Password" required />
                <button type="submit" className="auth-btn">Reset Password</button>
                <button type="button" className="auth-btn" onClick={() => { setIsForgot(false); setMessage(""); }}>
                  Back to Sign In
                </button>
              </form>
            ) : (
              <form className="auth-form" onSubmit={handleLogin}>
                <h2>Welcome Back</h2>
                <input type="email" placeholder="Email" required />
                <input type="password" placeholder="Password" required />
                <button type="submit" className="auth-btn">
                  Sign In
                </button>
                <button type="button" className="auth-link" onClick={() => { setIsForgot(true); setMessage(""); }}>
                  Forgot Password?
                </button>
              </form>
            )
          ) : (
            <form
              className="auth-form"
              onSubmit={async (e) => {
                e.preventDefault();
                const name = e.target[0].value;
                const email = e.target[1].value;
                const password = e.target[2].value;

                try {
                  const res = await axios.post(`${API_BASE}/api/auth/register`, {
                    name,
                    email,
                    password,
                  });

                  login(res.data);
                  navigate("/dashboard");
                } catch (err) {
                  alert(err.response?.data?.message || "Registration failed");
                }
              }}
            >
              <button
                type="button"
                className="auth-link"
                onClick={() => {
                  setIsLogin(true);
                  setMessage("");
                }}
              >
                Already have account? Sign In
              </button>
              <h2>Create Account</h2>
              <input type="text" placeholder="Full Name" required />
              <input type="email" placeholder="Email" required />
              <input type="password" placeholder="Password" required />
              <button type="submit" className="auth-btn">
                Register
              </button>
            </form>
          )}

        </div>
      </div>
    </div>
  );
}

export default Auth;
