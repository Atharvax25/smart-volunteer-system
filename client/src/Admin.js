import "./App.css";
import { useState } from "react";
import adminBg from "./assets/admin-bg.png"; // or .jpg

function Admin() {

  // 🔥 STATES
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("");

  // 🔥 SAMPLE DATA (later from backend)
  const tasks = [
    { title: "Food Distribution", location: "Pune", severity: "high" },
    { title: "Teaching Kids", location: "Mumbai", severity: "medium" },
    { title: "Medical Camp", location: "Delhi", severity: "high" }
  ];

  return (
    <div
  className="admin-container"
  style={{
    backgroundImage: `linear-gradient(rgba(0,0,0,0.6), rgba(0,0,0,0.6)), url(${adminBg})`
  }}
>

      {/* TITLE */}
      <h2 className="admin-title">📊 Admin Dashboard</h2>

      {/* STATS */}
      <div className="admin-stats">
        <div className="stat-card">
          <h3>📋 Tasks</h3>
          <p>{tasks.length}</p>
        </div>

        <div className="stat-card">
          <h3>🙋 Volunteers</h3>
          <p>25</p>
        </div>

        <div className="stat-card">
          <h3>⚡ Active</h3>
          <p>7</p>
        </div>
      </div>

      {/* 🔍 SEARCH + FILTER */}
      <div className="admin-controls">
        <input
          type="text"
          placeholder="Search tasks..."
          onChange={(e) => setSearch(e.target.value)}
        />

        <select onChange={(e) => setFilter(e.target.value)}>
          <option value="">All</option>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>
      </div>

      {/* TASK LIST */}
      <div className="admin-section">
        <h3>📍 Tasks</h3>

        {tasks
          .filter(task =>
            task.title.toLowerCase().includes(search.toLowerCase())
          )
          .filter(task =>
            filter === "" ? true : task.severity === filter
          )
          .map((task, index) => (
            <div key={index} className="list-card">
              {task.title} - {task.location} ({task.severity})
            </div>
          ))
        }
      </div>

      {/* VOLUNTEERS */}
      <div className="admin-section">
        <h3>👥 Volunteers</h3>
        <div className="list-card">Rahul - Teaching - Pune</div>
        <div className="list-card">Priya - Medical - Mumbai</div>
      </div>

    </div>
  );
}

export default Admin;