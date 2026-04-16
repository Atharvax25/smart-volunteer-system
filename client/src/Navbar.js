import { Link } from "react-router-dom";
import "./App.css";

function Navbar() {
  return (
    <div className="navbar">
      <Link to="/" className="logo-link">
        <h2 className="logo">SevaLink</h2>
      </Link>

      <div className="nav-links">
        <Link to="/">Home</Link>
        <a href="/#about">About</a>
        <a href="/#features">Features</a>
        <Link to="/tasks">Tasks</Link>
        <Link to="/auth" className="nav-auth-link">
          Login / Register
        </Link>
      </div>
    </div>
  );
}

export default Navbar;
