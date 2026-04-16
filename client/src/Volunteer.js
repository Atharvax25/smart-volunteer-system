import { useState, useEffect } from "react";

function Volunteer() {
  const [tasks, setTasks] = useState([]);

  useEffect(() => {
    const dummyTasks = [
      {
        _id: 1,
        title: "Medical Help",
        location: "Mumbai",
        skills: "medical"
      },
      {
        _id: 2,
        title: "Teaching Kids",
        location: "Delhi",
        skills: "teaching"
      }
    ];

    setTasks(dummyTasks);
  }, []);

  return (
    <div>

      <h2>My Tasks</h2>

      {tasks.map(task => (
        <div key={task._id} className="list-card">
          <h4>{task.title}</h4>

          <p>📍 {task.location}</p>
          <p>🛠 Skills: {task.skills}</p>
        </div>
      ))}

    </div>
  );
}

export default Volunteer;