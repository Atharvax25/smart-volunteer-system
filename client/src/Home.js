import { Link } from "react-router-dom";
import heroImg from "./assets/hero.png";
import "./App.css";

import AOS from "aos";
import "aos/dist/aos.css";
import { useEffect } from "react";

import Footer from "./Footer";

function Home() {
  useEffect(() => {
    AOS.init({ duration: 1000 });
  }, []);

  return (
    <div>
      <div
        id="home"
        className="hero"
        style={{
          backgroundImage: `linear-gradient(rgba(0,0,0,0.6), rgba(0,0,0,0.6)), url(${heroImg})`,
        }}
      >
        <div className="hero-content">
          <h1 className="fade-text">Connecting People. Creating Impact.</h1>

          <p>
            Seamlessly linking volunteers with real-world needs through SevaLink
          </p>

          <div className="hero-buttons">
            <Link to="/auth" className="btn hero-link-btn">
              Login / Register
            </Link>
            <a href="#about" className="btn-outline hero-link-btn">
              Learn More
            </a>
          </div>
        </div>
      </div>

      <div className="stats">
        <div className="stat-box">
          <h2>100+</h2>
          <p>Volunteers</p>
        </div>

        <div className="stat-box">
          <h2>50+</h2>
          <p>Tasks Completed</p>
        </div>

        <div className="stat-box">
          <h2>20+</h2>
          <p>NGOs Connected</p>
        </div>
      </div>

      <div id="about" className="about" data-aos="fade-up">
        <h2>About SevaLink</h2>
        <p>
          SevaLink connects NGOs with passionate volunteers, making it easier to
          manage tasks and create meaningful social impact through technology.
        </p>
      </div>

      <div id="features" className="features">
        <div className="card" data-aos="zoom-in">
          <div className="icon">Tasks</div>
          <h3>Add Tasks</h3>
          <p>NGOs can post tasks and manage requirements easily</p>
        </div>

        <div className="card" data-aos="zoom-in" data-aos-delay="200">
          <div className="icon">People</div>
          <h3>Volunteers</h3>
          <p>People can register and contribute to real-world impact</p>
        </div>

        <div className="card" data-aos="zoom-in" data-aos-delay="400">
          <div className="icon">Match</div>
          <h3>Smart Match</h3>
          <p>Automatically connects the right people to the right tasks</p>
        </div>
      </div>

      <Footer />
    </div>
  );
}

export default Home;
