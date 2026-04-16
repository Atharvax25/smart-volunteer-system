const Task = require("../models/Task");
const User = require("../models/User");

function normalizeSkills(skillsInput) {
  if (Array.isArray(skillsInput)) {
    return [...new Set(skillsInput.map((skill) => String(skill).trim().toLowerCase()).filter(Boolean))];
  }

  return [...new Set(String(skillsInput || "")
    .split(",")
    .map((skill) => skill.trim().toLowerCase())
    .filter(Boolean))];
}

function getMatchPayload(taskSkills, volunteer) {
  const volunteerSkills = Array.isArray(volunteer.skills) ? volunteer.skills : [];
  const matchedSkills = volunteerSkills.filter((skill) => taskSkills.includes(skill));

  return {
    volunteer: volunteer._id,
    volunteerName: volunteer.name,
    volunteerEmail: volunteer.email,
    volunteerSkills,
    matchedSkills,
    matchScore: matchedSkills.length,
  };
}

function serializeTask(task, currentUserId) {
  const taskObject = task.toObject ? task.toObject() : task;
  const currentApplication = currentUserId
    ? (taskObject.applications || []).find(
        (application) => String(application.volunteer) === String(currentUserId)
      )
    : null;

  return {
    ...taskObject,
    hasApplied: Boolean(currentApplication),
    currentUserApplicationStatus: currentApplication?.status || null,
  };
}

async function createTask(req, res) {
  try {
    const { title, description, location, severity, skills } = req.body;

    if (!title || !description || !location) {
      return res.status(400).json({ message: "Title, description, and location are required" });
    }

    const task = await Task.create({
      title: title.trim(),
      description: description.trim(),
      location: location.trim(),
      severity: ["low", "medium", "high"].includes(severity) ? severity : "medium",
      skills: normalizeSkills(skills),
      createdBy: req.user.id,
      reporterName: req.user.name,
    });

    return res.status(201).json({
      message: "Task created successfully",
      task: serializeTask(task),
    });
  } catch (error) {
    return res.status(500).json({ message: "Unable to create task" });
  }
}

async function getTasks(req, res) {
  try {
    const status = req.query.status;
    const filter = status ? { status } : { status: "open" };

    const tasks = await Task.find(filter)
      .sort({ createdAt: -1 })
      .select("title description location severity skills status reporterName createdAt");

    return res.json(tasks.map((task) => serializeTask(task)));
  } catch (error) {
    return res.status(500).json({ message: "Unable to fetch tasks" });
  }
}

async function getVolunteerDashboard(req, res) {
  try {
    const volunteerId = req.user.id;

    const [openTasks, pendingConfirmationTasks, assignedTasks, completedTasks] = await Promise.all([
      Task.find({ status: "open" }).sort({ createdAt: -1 }),
      Task.find({ status: "pending_confirmation", "assignedVolunteer.volunteer": volunteerId }).sort({ assignedAt: -1 }),
      Task.find({ status: "assigned", "assignedVolunteer.volunteer": volunteerId }).sort({ assignedAt: -1 }),
      Task.find({ status: "completed", "assignedVolunteer.volunteer": volunteerId }).sort({ completedAt: -1 }),
    ]);

    return res.json({
      openTasks: openTasks.map((task) => serializeTask(task, volunteerId)),
      pendingConfirmationTasks: pendingConfirmationTasks.map((task) => serializeTask(task, volunteerId)),
      assignedTasks: assignedTasks.map((task) => serializeTask(task, volunteerId)),
      completedTasks: completedTasks.map((task) => serializeTask(task, volunteerId)),
    });
  } catch (error) {
    return res.status(500).json({ message: "Unable to load volunteer dashboard" });
  }
}

async function getAdminDashboard(req, res) {
  try {
    const [openTasks, pendingConfirmationTasks, assignedTasks, completedTasks, volunteers] = await Promise.all([
      Task.find({ status: "open" }).sort({ createdAt: -1 }),
      Task.find({ status: "pending_confirmation" }).sort({ assignedAt: -1 }),
      Task.find({ status: "assigned" }).sort({ assignedAt: -1 }),
      Task.find({ status: "completed" }).sort({ completedAt: -1 }),
      User.find({ role: "Volunteer" }).select("name email skills createdAt").sort({ createdAt: -1 }),
    ]);

    return res.json({
      openTasks: openTasks.map((task) => serializeTask(task)),
      pendingConfirmationTasks: pendingConfirmationTasks.map((task) => serializeTask(task)),
      assignedTasks: assignedTasks.map((task) => serializeTask(task)),
      completedTasks: completedTasks.map((task) => serializeTask(task)),
      volunteers,
    });
  } catch (error) {
    return res.status(500).json({ message: "Unable to load admin dashboard" });
  }
}

async function applyForTask(req, res) {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    if (task.status !== "open") {
      return res.status(400).json({ message: "Only open tasks can receive volunteer applications" });
    }

    const alreadyApplied = task.applications.some(
      (application) => String(application.volunteer) === String(req.user.id)
    );
    if (alreadyApplied) {
      return res.status(409).json({ message: "You have already applied for this task" });
    }

    task.applications.push({
      volunteer: req.user.id,
      volunteerName: req.user.name,
      volunteerEmail: req.user.email,
      volunteerSkills: req.user.skills || [],
      status: "pending",
      appliedAt: new Date(),
    });

    await task.save();

    return res.json({
      message: "Application sent to admin successfully",
      task: serializeTask(task, req.user.id),
    });
  } catch (error) {
    return res.status(500).json({ message: "Unable to apply for task" });
  }
}

async function runTaskMatching(req, res) {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    const volunteers = await User.find({ role: "Volunteer" }).select("name email skills");
    const taskSkills = Array.isArray(task.skills) ? task.skills : [];

    const rankedVolunteers = volunteers
      .map((volunteer) => getMatchPayload(taskSkills, volunteer))
      .sort((left, right) => right.matchScore - left.matchScore || left.volunteerName.localeCompare(right.volunteerName));

    task.matchedVolunteers = rankedVolunteers;
    await task.save();

    return res.json({
      message: "Task matching completed",
      task: serializeTask(task),
    });
  } catch (error) {
    return res.status(500).json({ message: "Unable to run task matching" });
  }
}

async function assignTask(req, res) {
  try {
    const { volunteerId } = req.body;
    if (!volunteerId) {
      return res.status(400).json({ message: "Volunteer selection is required" });
    }

    const [task, volunteer] = await Promise.all([
      Task.findById(req.params.id),
      User.findOne({ _id: volunteerId, role: "Volunteer" }).select("name email skills"),
    ]);

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    if (!volunteer) {
      return res.status(404).json({ message: "Volunteer not found" });
    }

    const taskSkills = Array.isArray(task.skills) ? task.skills : [];
    const matchPayload = getMatchPayload(taskSkills, volunteer);

    task.assignedVolunteer = matchPayload;
    task.status = "pending_confirmation";
    task.assignedAt = new Date();

    const existingApplication = task.applications.find(
      (application) => String(application.volunteer) === String(volunteer._id)
    );

    if (existingApplication) {
      existingApplication.status = "accepted";
    } else {
      task.applications.push({
        volunteer: volunteer._id,
        volunteerName: volunteer.name,
        volunteerEmail: volunteer.email,
        volunteerSkills: volunteer.skills || [],
        status: "accepted",
        appliedAt: new Date(),
      });
    }

    task.applications.forEach((application) => {
      if (String(application.volunteer) !== String(volunteer._id) && application.status === "pending") {
        application.status = "rejected";
      }
    });

    await task.save();

    return res.json({
      message: "Volunteer assigned. Waiting for volunteer confirmation.",
      task: serializeTask(task),
    });
  } catch (error) {
    return res.status(500).json({ message: "Unable to assign volunteer" });
  }
}

async function confirmAssignedTask(req, res) {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    if (!task.assignedVolunteer || String(task.assignedVolunteer.volunteer) !== String(req.user.id)) {
      return res.status(403).json({ message: "This assignment is not available for your account" });
    }

    if (task.status !== "pending_confirmation") {
      return res.status(400).json({ message: "This task is not waiting for volunteer confirmation" });
    }

    task.status = "assigned";
    await task.save();

    return res.json({
      message: "Task confirmed successfully",
      task: serializeTask(task, req.user.id),
    });
  } catch (error) {
    return res.status(500).json({ message: "Unable to confirm assignment" });
  }
}

async function completeTask(req, res) {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    const isAssignedVolunteer =
      task.assignedVolunteer && String(task.assignedVolunteer.volunteer) === String(req.user.id);
    const isAdmin = req.user.role === "NGO";

    if (!isAssignedVolunteer && !isAdmin) {
      return res.status(403).json({ message: "You do not have permission to complete this task" });
    }

    task.status = "completed";
    task.completedAt = new Date();
    await task.save();

    return res.json({
      message: "Task marked as completed",
      task: serializeTask(task, req.user.id),
    });
  } catch (error) {
    return res.status(500).json({ message: "Unable to complete task" });
  }
}

module.exports = {
  createTask,
  getTasks,
  getVolunteerDashboard,
  getAdminDashboard,
  applyForTask,
  runTaskMatching,
  assignTask,
  confirmAssignedTask,
  completeTask,
};
