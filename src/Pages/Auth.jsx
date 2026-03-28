import { useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { AuthContext } from "../context/AuthContext";
import "./Auth.css";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [isForgot, setIsForgot] = useState(false);
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [message, setMessage] = useState("");
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const email = formData.get("email");
    const password = formData.get("password");

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

  const renderEyeIcon = (visible) => (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <path
        d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle
        cx="12"
        cy="12"
        r="3"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      {!visible && (
        <line
          x1="3"
          y1="3"
          x2="21"
          y2="21"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      )}
    </svg>
  );

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
                  const formData = new FormData(e.target);
                  const email = formData.get("email");
                  const newPassword = formData.get("newPassword");

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
                <input type="email" name="email" placeholder="Email" required />
                <div className="password-field">
                  <input
                    type={showResetPassword ? "text" : "password"}
                    name="newPassword"
                    placeholder="New Password"
                    required
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowResetPassword((prev) => !prev)}
                    aria-label={showResetPassword ? "Hide password" : "Show password"}
                  >
                    {renderEyeIcon(showResetPassword)}
                  </button>
                </div>
                <button type="submit" className="auth-btn">Reset Password</button>
                <button type="button" className="auth-btn" onClick={() => { setIsForgot(false); setMessage(""); }}>
                  Back to Sign In
                </button>
              </form>
            ) : (
              <form className="auth-form" onSubmit={handleLogin}>
                <h2>Welcome Back</h2>
                <input type="email" name="email" placeholder="Email" required />
                <div className="password-field">
                  <input
                    type={showLoginPassword ? "text" : "password"}
                    name="password"
                    placeholder="Password"
                    required
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowLoginPassword((prev) => !prev)}
                    aria-label={showLoginPassword ? "Hide password" : "Show password"}
                  >
                    {renderEyeIcon(showLoginPassword)}
                  </button>
                </div>
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
                const formData = new FormData(e.target);
                const name = formData.get("name");
                const email = formData.get("email");
                const password = formData.get("password");

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
              <input type="text" name="name" placeholder="Full Name" required />
              <input type="email" name="email" placeholder="Email" required />
              <div className="password-field">
                <input
                  type={showRegisterPassword ? "text" : "password"}
                  name="password"
                  placeholder="Password"
                  required
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowRegisterPassword((prev) => !prev)}
                  aria-label={showRegisterPassword ? "Hide password" : "Show password"}
                >
                  {renderEyeIcon(showRegisterPassword)}
                </button>
              </div>
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
