import "./App.css";

function App() {
  return (
    <div className="main">

      {/* 🔵 Top Government Bar */}
      <div style={{
        background: "#0d47a1",
        color: "white",
        padding: "10px",
        fontWeight: "500"
      }}>
        Government Volunteer Management System
      </div>

      <div className="overlay">

        <div className="headerBox">
  <h1 className="title">🌍 Smart Volunteer System</h1>
  <p className="subtitle">Connecting Needs with Helping Hands</p>
</div>
        <div className="menu">

          <button className="btn">➕ Add NGO Task</button>

          <button className="btn">🙋 Register Volunteer</button>

          <button className="btn">⚡ Run Matching</button>

          <button className="btn">📊 View Dashboard</button>

        </div>

      </div>
    </div>
  );
}

export default App;