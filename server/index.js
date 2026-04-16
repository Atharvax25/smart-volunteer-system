const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");

const app = express();

app.use(cors());
app.use(express.json());

mongoose.connect("mongodb://127.0.0.1:27017/sevalink")
  .then(() => console.log("MongoDB Connected ✅"))
  .catch(err => console.log(err));

const Task = require("./models/Task");

// create task
app.post("/tasks", async (req, res) => {
  const task = new Task(req.body);
  await task.save();
  res.json(task);
});

// get all tasks
app.get("/tasks", async (req, res) => {
  const tasks = await Task.find();
  res.json(tasks);
});

// assign task
app.put("/assign/:id", async (req, res) => {
  const { volunteer } = req.body;

  const task = await Task.findByIdAndUpdate(
    req.params.id,
    { status: "assigned", assignedTo: volunteer },
    { new: true }
  );

  res.json(task);
});

// volunteer tasks
app.get("/mytasks/:name", async (req, res) => {
  const tasks = await Task.find({ assignedTo: req.params.name });
  res.json(tasks);
});

app.listen(5000, () => {
  console.log("Server running on port 5000 🚀");
});