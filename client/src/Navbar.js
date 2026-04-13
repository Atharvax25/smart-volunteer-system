import { Link } from "react-router-dom";
import "./App.css";

function Navbar() {
  return (
    <div className="navbar">
      <h2 className="logo">🤝 SevaLink</h2>

      <div className="nav-links">
        {/* FIXED */}
        <Link to="/">Home</Link>

        {/* Optional scroll (only works on home) */}
        <a href="/#about">About</a>
        <a href="/#features">Features</a>

        <Link to="/tasks">Tasks</Link>
        <Link to="/volunteer">Volunteer</Link>
        <Link to="/admin">Admin</Link>
      </div>
    </div>
  );
}

export default Navbar;