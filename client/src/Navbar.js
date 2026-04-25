import { Link } from "react-router-dom";
import "./App.css";
import sevalinkLogo from "./assets/sevalink-logo-3d.png";

function Navbar() {
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
        <Link to="/auth" className="nav-auth-link">
          Login / Register
        </Link>
      </div>
    </div>
  );
}

export default Navbar;
