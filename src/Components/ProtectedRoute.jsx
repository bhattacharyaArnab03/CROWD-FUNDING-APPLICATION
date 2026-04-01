import { useContext } from "react";
import { Navigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";

function ProtectedRoute({ children, role, guestOnly }) {
  const { user } = useContext(AuthContext);

  // If user is logged in but trying to access a guest-only page (like Login)
  if (user && guestOnly) {
    return <Navigate to={user.role === "admin" ? "/admin" : "/dashboard"} />;
  }

  // If page requires login but user is not logged in
  if (!user && !guestOnly) {
    return <Navigate to="/auth" />;
  }

  // If user is logged in but role doesn't match
  if (user && role && user.role !== role) {
    return (
      <Navigate
        to={user.role === "admin" ? "/admin" : "/dashboard"}
      />
    );
  }

  return children;
}

export default ProtectedRoute;
