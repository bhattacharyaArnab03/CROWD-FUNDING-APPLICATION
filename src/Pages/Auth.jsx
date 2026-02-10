import { useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import "./Auth.css";

function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogin = (e) => {
    e.preventDefault();

    const email = e.target[0].value;
    const password = e.target[1].value;

    if (email === "admin@cf.com" && password === "admin123") {
      login({ name: "Admin", role: "admin", email });
      navigate("/admin");
    } 
    else if (email === "user@cf.com" && password === "user123") {
      login({ name: "User", role: "user", email });
      navigate("/dashboard");
    } 
    else {
      alert("Invalid credentials");
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

          {isLogin ? (
            <form className="auth-form" onSubmit={handleLogin}>
              <h2>Welcome Back</h2>
              <input type="email" placeholder="Email" required />
              <input type="password" placeholder="Password" required />
              <button type="submit" className="auth-btn">
                Sign In
              </button>
            </form>
          ) : (
            <form className="auth-form">
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
