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

      {/* HERO */}
      <div
        id="home"
        className="hero"
        style={{
          backgroundImage: `linear-gradient(rgba(0,0,0,0.6), rgba(0,0,0,0.6)), url(${heroImg})`
        }}
      >
        <div className="hero-content">
          <h1 className="fade-text">
            Connecting People. Creating Impact.
          </h1>

          <p>
            Seamlessly linking volunteers with real-world needs through SevaLink
          </p>

          <div className="hero-buttons">
            <button className="btn">Get Started</button>
            <button className="btn-outline">Learn More</button>
          </div>
        </div>
      </div>

      {/* STATS */}
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

      {/* ABOUT */}
      <div id="about" className="about" data-aos="fade-up">
        <h2>About SevaLink</h2>
        <p>
          SevaLink connects NGOs with passionate volunteers, making it easier
          to manage tasks and create meaningful social impact through technology.
        </p>
      </div>

      {/* FEATURES */}
      <div id="features" className="features">

        <div className="card" data-aos="zoom-in">
          <div className="icon">📍</div>
          <h3>Add Tasks</h3>
          <p>NGOs can post tasks and manage requirements easily</p>
        </div>

        <div className="card" data-aos="zoom-in" data-aos-delay="200">
          <div className="icon">🙋</div>
          <h3>Volunteers</h3>
          <p>People can register and contribute to real-world impact</p>
        </div>

        <div className="card" data-aos="zoom-in" data-aos-delay="400">
          <div className="icon">⚡</div>
          <h3>Smart Match</h3>
          <p>Automatically connects the right people to the right tasks</p>
        </div>

      </div>

      {/* FOOTER */}
      <Footer />

    </div>
  );
}

export default Home;