import "./App.css";
import Navbar from "./Navbar";
import heroImg from "./assets/hero.png"; // make sure this exists

function App() {
  return (
    <div>
      <Navbar />

      {/* HERO SECTION */}
      <div
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
    </div>
  );
}

export default App;