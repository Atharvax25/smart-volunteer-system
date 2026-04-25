import { Link } from "react-router-dom";
import "./App.css";
import sevalinkLogo from "./assets/sevalink-logo-3d.png";

function Footer() {
  return (
    <div className="footer">
      <div className="footer-logo-shell">
        <img className="footer-logo" src={sevalinkLogo} alt="SevaLink logo" />
      </div>
      <h2>SevaLink</h2>
      <p>Connecting Help to Those Who Need It Most.</p>

      <div className="footer-links">
        <Link to="/">Home</Link>
        <a href="/#about">About</a>
        <Link to="/tasks">Tasks</Link>
        <Link to="/auth">Login</Link>
      </div>

      <p className="copyright">(c) 2026 SevaLink. All rights reserved.</p>
    </div>
  );
}

export default Footer;
