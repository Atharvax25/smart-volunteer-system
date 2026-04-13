import "./App.css";
import { useState } from "react";

function Tasks() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const handleSubmit = () => {
    alert("Task Submitted 🚀");
  };

  return (
    <div className="task-wrapper">

      <div className="task-card">
        <h2>Add New Task</h2>

        <input
          type="text"
          placeholder="Task Title"
          onChange={(e) => setTitle(e.target.value)}
        />

        <textarea
          placeholder="Task Description"
          onChange={(e) => setDescription(e.target.value)}
        ></textarea>

        <button className="btn" onClick={handleSubmit}>
          Submit Task
        </button>
      </div>

    </div>
  );
}

export default Tasks;