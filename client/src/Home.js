import { useNavigate } from "react-router-dom";
import "./App.css";

function Home() {
  const navigate = useNavigate();

  return (
    <div className="main">
      <div className="overlay">

        <h1 className="title">🌍 Smart Volunteer System</h1>
        <p className="subtitle">Connecting Needs with Helping Hands</p>

        <div className="menu">

          <button className="btn" onClick={() => navigate("/task")}>
            ➕ Add NGO Task
          </button>

          <button className="btn">
            🙋 Register Volunteer
          </button>

          <button className="btn">
            ⚡ Run Matching
          </button>

          <button className="btn">
            📊 View Dashboard
          </button>

        </div>

      </div>
    </div>
  );
}

export default Home;