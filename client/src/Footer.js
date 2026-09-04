import { Link } from "react-router-dom";
import "./App.css";
import samadhanSetuLogo from "./assets/samadhan-setu-logo-horizontal.svg";

function Footer() {
  return (
    <div className="footer">
      <div className="footer-logo-shell">
        <img className="footer-logo" src={samadhanSetuLogo} alt="Samadhan Setu logo" />
      </div>
      <h2>Samadhan Setu</h2>
      <p>Connecting Help to Those Who Need It Most.</p>

      <div className="footer-links">
        <Link to="/">Home</Link>
        <a href="/#about">About</a>
        <Link to="/tasks">Tasks</Link>
        <Link to="/auth">Login</Link>
      </div>

      <p className="copyright">(c) 2026 Samadhan Setu. All rights reserved.</p>
    </div>
  );
}

export default Footer;
