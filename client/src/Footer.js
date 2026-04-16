import { Link } from "react-router-dom";
import "./App.css";

function Footer() {
  return (
    <div className="footer">
      <h2>SevaLink</h2>
      <p>Connecting people. Creating impact.</p>

      <div className="footer-links">
        <Link to="/">Home</Link>
        <a href="/#about">About</a>
        <Link to="/tasks">Tasks</Link>
        <Link to="/auth">Login</Link>
      </div>

      <p className="copyright">© 2026 SevaLink. All rights reserved.</p>
    </div>
  );
}

export default Footer;
