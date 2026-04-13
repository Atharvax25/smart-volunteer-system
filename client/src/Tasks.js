import "./App.css";
import { useState } from "react";
import { toast } from "react-toastify"; // ✅ FIXED (top)

function Tasks() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [severity, setSeverity] = useState("");

  const handleSubmit = () => {
    const data = {
      title,
      description,
      location,
      severity
    };

    console.log(data);

    // ✅ Toast used here
    toast.success("Task submitted successfully 🚀");
  };

  return (
    <div className="task-wrapper">

      <div className="task-card">

        <h2>Create a Task</h2>

        <p className="task-desc">
          Post a task to connect with volunteers. Add location and urgency
          so we can match the right people faster.
        </p>

        {/* TITLE */}
        <input
          type="text"
          placeholder="Task Title (e.g. Food Distribution)"
          onChange={(e) => setTitle(e.target.value)}
        />

        {/* DESCRIPTION */}
        <textarea
          placeholder="Describe the task (time, details, requirements...)"
          onChange={(e) => setDescription(e.target.value)}
        ></textarea>

        {/* LOCATION */}
        <input
          type="text"
          placeholder="Location (e.g. Pune, Mumbai)"
          onChange={(e) => setLocation(e.target.value)}
        />

        {/* SEVERITY */}
        <select onChange={(e) => setSeverity(e.target.value)}>
          <option value="">Select Urgency Level</option>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>

        {/* BUTTON */}
        <button className="btn" onClick={handleSubmit}>
          Submit Task
        </button>

        <p className="task-note">
          ⚡ Higher urgency tasks are prioritized for faster matching
        </p>

      </div>

    </div>
  );
}

export default Tasks;