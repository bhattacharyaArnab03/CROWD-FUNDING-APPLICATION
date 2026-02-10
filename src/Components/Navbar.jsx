import { Link, useNavigate } from "react-router-dom";
import { useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import "./Navbar.css";

function Navbar() {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/auth");
  };

  return (
    <nav className="navbar">
      <div className="logo">CrowdFundX</div>

      <div className="nav-links">

        <Link to="/">Home</Link>

        {!user && (
          <Link to="/explore">Explore</Link>
        )}

        {user?.role === "user" && (
          <>
            <Link to="/explore">Explore</Link>
            <Link to="/dashboard">Dashboard</Link>
          </>
        )}

        {user?.role === "admin" && (
          <Link to="/admin">Admin Panel</Link>
        )}

        {!user ? (
          <Link to="/auth" className="auth-btn-nav">
            Login / Sign Up
          </Link>
        ) : (
          <>
            <span className="profile-link">{user.name}</span>
            <button className="logout-btn" onClick={handleLogout}>
              Logout
            </button>
          </>
        )}

      </div>
    </nav>
  );
}

export default Navbar;