import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import "./App.css";
import sevalinkLogo from "./assets/sevalink-logo-3d.png";
import {
  AUTH_EVENT,
  clearStoredSession,
  getStoredSession,
} from "./utils/sevalink";

function Navbar() {
  const [session, setSession] = useState(() => getStoredSession());

  useEffect(() => {
    const syncSession = () => {
      setSession(getStoredSession());
    };

    const handleAuthChange = (event) => {
      setSession(event.detail ?? getStoredSession());
    };

    window.addEventListener("storage", syncSession);
    window.addEventListener(AUTH_EVENT, handleAuthChange);

    return () => {
      window.removeEventListener("storage", syncSession);
      window.removeEventListener(AUTH_EVENT, handleAuthChange);
    };
  }, []);

  const profileLink = useMemo(() => {
    if (!session?.user) {
      return "/auth";
    }

    return session.user.role === "NGO" ? "/admin" : "/tasks";
  }, [session]);

  const initials = useMemo(() => {
    const name = session?.user?.name || "";
    return name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("");
  }, [session]);

  return (
    <div className="navbar">
      <Link to="/home" className="logo-link">
        <div className="nav-brand">
          <img className="nav-brand-logo" src={sevalinkLogo} alt="SevaLink logo" />
        </div>
      </Link>

      <div className="nav-links">
        <Link to="/home">Home</Link>
        <a href="/home#about">About</a>
        <a href="/home#features">Features</a>
        <Link to="/tasks">Tasks</Link>

        {session?.user ? (
          <div className="nav-profile-shell">
            <Link to={profileLink} className="nav-profile-card">
              <span className="nav-profile-avatar">{initials || "SL"}</span>
              <span className="nav-profile-copy">
                <strong>{session.user.name}</strong>
                <small>{session.user.role === "NGO" ? "NGO Profile" : "Volunteer Profile"}</small>
              </span>
            </Link>

            <button
              type="button"
              className="nav-profile-logout"
              onClick={() => clearStoredSession()}
            >
              Logout
            </button>
          </div>
        ) : (
          <Link to="/auth" className="nav-auth-link">
            Login / Register
          </Link>
        )}
      </div>
    </div>
  );
}

export default Navbar;
