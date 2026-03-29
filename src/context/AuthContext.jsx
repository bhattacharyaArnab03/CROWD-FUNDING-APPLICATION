
import { createContext, useState, useEffect } from "react";
import axios from "axios";

export const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Always send credentials (cookies) with requests
  axios.defaults.withCredentials = true;

  useEffect(() => {
    // On mount, check if user session exists
    const checkSession = async () => {
      try {
        const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";
        const res = await axios.get(`${API_BASE}/api/auth/me`);
        setUser(res.data);
      } catch (err) {
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    checkSession();
  }, []);

  const login = (userData) => {
    setUser(userData);
  };

  const logout = () => {
    setUser(null);
    // Optionally, call backend logout endpoint
    const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";
    axios.post(`${API_BASE}/api/auth/logout`).catch(() => {});
  };

  if (loading) {
    // Optionally, show a loading spinner or null while checking session
    return null;
  }

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
