const Notification = require("../models/Notification");
const Task = require("../models/Task");
const User = require("../models/User");
const {
  buildCategoryBreakdown,
  buildHeatmapPoints,
  buildLeaderboard,
  buildPredictionReport,
  buildSeverityBreakdown,
} = require("../services/analyticsService");
const { awardCompletionRewards } = require("../services/gamificationService");
const { rankVolunteersForTask } = require("../services/matchingService");
const {
  notifyNearbyVolunteers,
  notifyVolunteerAssignment,
} = require("../services/notificationService");
const { normalizeGeoPoint, parseMapLink } = require("../utils/geo");
const { serializeTask } = require("../utils/taskSerializers");
const { deriveTaskSignals } = require("../utils/taskSignals");
const { normalizeSkills } = require("../utils/skills");

function ownsTask(task, userId) {
  return String(task.ngoId || task.createdBy) === String(userId);
}

async function buildActiveAssignmentMap() {
  const rows = await Task.aggregate([
    {
      $match: {
        status: { $in: ["pending_confirmation", "assigned", "completion_requested"] },
        "assignedVolunteer.volunteer": { $ne: null },
      },
    },
    {
      $group: {
        _id: "$assignedVolunteer.volunteer",
        count: { $sum: 1 },
      },
    },
  ]);

  return rows.reduce((accumulator, row) => {
    accumulator[String(row._id)] = row.count;
    return accumulator;
  }, {});
}

async function getVolunteerPool() {
  return User.find({ role: "Volunteer" }).select(
    "name email skills location availability availabilityScore geoLocation rating points badges tasksCompleted notificationsEnabled"
  );
}

function getTaskIdFromRequest(req) {
  return req.params.id || req.params.taskId;
}

async function getRankedVolunteersForTask(task) {
  const [volunteers, activeAssignmentMap] = await Promise.all([
    getVolunteerPool(),
    buildActiveAssignmentMap(),
  ]);

  return rankVolunteersForTask(task, volunteers, activeAssignmentMap);
}

function applyAssignment(task, volunteer, matchPayload) {
  task.assignedVolunteer = matchPayload;
  task.status = "pending_confirmation";
  task.assignedAt = new Date();
  task.assignedTo = volunteer.name;
  task.matchingScore = matchPayload.matchScore || 0;

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
    if (String(application.volunteer) !== String(volunteer._id) && application.status !== "rejected") {
      application.status = "rejected";
    }
  });
}

async function createTask(req, res) {
  try {
    const {
      title,
      description,
      location,
      severity,
      skills,
      latitude,
      longitude,
      mapLink,
      imageLabel,
    } = req.body;

    if (!title || !description || !location) {
      return res.status(400).json({ message: "Title, description, and location are required" });
    }

    const normalizedSkills = normalizeSkills(skills);
    const normalizedMapLink = String(mapLink || "").trim();
    const geoLocation =
      normalizeGeoPoint(latitude, longitude) ||
      parseMapLink(normalizedMapLink) || { lat: null, lng: null };
    const signals = deriveTaskSignals({
      title,
      description,
      severity,
      skills: normalizedSkills,
      imageLabel,
      imageFileName: req.file?.originalname,
    });

    const task = await Task.create({
      title: title.trim(),
      description: description.trim(),
      location: location.trim(),
      mapLink: normalizedMapLink,
      geoLocation,
      severity: signals.severity,
      urgencyScore: signals.urgencyScore,
      category: signals.category,
      imageUrl: req.file ? `/uploads/${req.file.filename}` : "",
      imageTag: signals.imageTag,
      imageTags: signals.imageTags,
      escalationReason: signals.escalationReason,
      skills: normalizedSkills,
      sharedVisibility: req.body.sharedVisibility !== "false",
      ngoId: req.user.id,
      createdBy: req.user.id,
      reporterName: req.user.name,
    });

    if (["high", "critical"].includes(task.severity)) {
      const rankedVolunteers = await getRankedVolunteersForTask(task);
      task.matchedVolunteers = rankedVolunteers.slice(0, 8);
      await task.save();
      notifyNearbyVolunteers(task, rankedVolunteers).catch(() => undefined);
    }

    return res.status(201).json({
      message:
        task.severity === "critical"
          ? "Critical task created and emergency escalation triggered"
          : "Task created successfully",
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

    if (!req.query.includePrivate) {
      filter.sharedVisibility = true;
    }

    const tasks = await Task.find(filter)
      .sort({ createdAt: -1 })
      .select(
        "title description location mapLink geoLocation severity urgencyScore category imageUrl imageTag imageTags escalationReason skills status reporterName createdAt sharedVisibility"
      );

    return res.json(tasks.map((task) => serializeTask(task)));
  } catch (error) {
    return res.status(500).json({ message: "Unable to fetch tasks" });
  }
}

async function getVolunteerDashboard(req, res) {
  try {
    const volunteerId = req.user.id;

    const [openTasks, pendingConfirmationTasks, assignedTasks, completionRequestedTasks, completedTasks] = await Promise.all([
      Task.find({ status: "open", sharedVisibility: true }).sort({ createdAt: -1 }),
      Task.find({
        status: "pending_confirmation",
        "assignedVolunteer.volunteer": volunteerId,
      }).sort({ assignedAt: -1 }),
      Task.find({ status: "assigned", "assignedVolunteer.volunteer": volunteerId }).sort({
        assignedAt: -1,
      }),
      Task.find({ status: "completion_requested", "assignedVolunteer.volunteer": volunteerId }).sort({
        completionRequestedAt: -1,
      }),
      Task.find({
        status: "completed",
        $or: [
          { "assignedVolunteer.volunteer": volunteerId },
          { "applications.volunteer": volunteerId },
        ],
      }).sort({ completedAt: -1 }),
    ]);

    return res.json({
      openTasks: openTasks.map((task) => serializeTask(task, volunteerId)),
      pendingConfirmationTasks: pendingConfirmationTasks.map((task) =>
        serializeTask(task, volunteerId)
      ),
      assignedTasks: assignedTasks.map((task) => serializeTask(task, volunteerId)),
      completionRequestedTasks: completionRequestedTasks.map((task) =>
        serializeTask(task, volunteerId)
      ),
      completedTasks: completedTasks.map((task) => serializeTask(task, volunteerId)),
    });
  } catch (error) {
    return res.status(500).json({ message: "Unable to load volunteer dashboard" });
  }
}

async function getAdminDashboard(req, res) {
  try {
    const ngoId = req.user.id;
    const [openTasks, pendingConfirmationTasks, assignedTasks, completionRequestedTasks, completedTasks, volunteers, sharedTasks, recentNotifications] =
      await Promise.all([
        Task.find({ ngoId, status: "open" }).sort({ createdAt: -1 }),
        Task.find({ ngoId, status: "pending_confirmation" }).sort({ assignedAt: -1 }),
        Task.find({ ngoId, status: "assigned" }).sort({ assignedAt: -1 }),
        Task.find({ ngoId, status: "completion_requested" }).sort({ completionRequestedAt: -1 }),
        Task.find({ ngoId, status: "completed" }).sort({ completedAt: -1 }),
        User.find({ role: "Volunteer" })
          .select(
            "name email skills location availability availabilityScore geoLocation rating points badges tasksCompleted organizationName"
          )
          .sort({ points: -1, tasksCompleted: -1, createdAt: -1 }),
        Task.find({ ngoId: { $ne: ngoId }, sharedVisibility: true, status: "open" })
          .sort({ createdAt: -1 })
          .limit(6),
        Notification.find({ ngoId }).sort({ createdAt: -1 }).limit(6).lean(),
      ]);

    const allOwnedTasks = [
      ...openTasks,
      ...pendingConfirmationTasks,
      ...assignedTasks,
      ...completionRequestedTasks,
      ...completedTasks,
    ];

    return res.json({
      openTasks: openTasks.map((task) => serializeTask(task)),
      pendingConfirmationTasks: pendingConfirmationTasks.map((task) => serializeTask(task)),
      assignedTasks: assignedTasks.map((task) => serializeTask(task)),
      completionRequestedTasks: completionRequestedTasks.map((task) => serializeTask(task)),
      completedTasks: completedTasks.map((task) => serializeTask(task)),
      sharedTasks: sharedTasks.map((task) => serializeTask(task)),
      volunteers,
      leaderboard: buildLeaderboard(volunteers),
      heatmapPoints: buildHeatmapPoints(allOwnedTasks),
      severityBreakdown: buildSeverityBreakdown(allOwnedTasks),
      categoryBreakdown: buildCategoryBreakdown(allOwnedTasks),
      predictions: buildPredictionReport(allOwnedTasks).predictions,
      recentNotifications,
    });
  } catch (error) {
    return res.status(500).json({ message: "Unable to load admin dashboard" });
  }
}

async function getMatchedVolunteers(req, res) {
  try {
    const task = await Task.findById(getTaskIdFromRequest(req));
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    if (!ownsTask(task, req.user.id)) {
      return res.status(403).json({ message: "This task belongs to another NGO" });
    }

    const rankedVolunteers = await getRankedVolunteersForTask(task);
    task.matchedVolunteers = rankedVolunteers;
    await task.save();

    return res.json({
      task: serializeTask(task),
      matches: rankedVolunteers.slice(0, 10),
      bestMatch: rankedVolunteers[0] || null,
    });
  } catch (error) {
    return res.status(500).json({ message: "Unable to calculate volunteer matches" });
  }
}

async function applyForTask(req, res) {
  try {
    const volunteerId = req.user.id;
    const [task, volunteer] = await Promise.all([
      Task.findById(getTaskIdFromRequest(req)),
      User.findOne({ _id: volunteerId, role: "Volunteer" }).select(
        "name email skills location availability availabilityScore geoLocation rating points badges tasksCompleted notificationsEnabled"
      ),
    ]);

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    if (!volunteer) {
      return res.status(404).json({ message: "Volunteer not found" });
    }

    if (task.status !== "open") {
      return res.status(400).json({ message: "This task is no longer open for volunteer acceptance" });
    }

    if (task.sharedVisibility === false) {
      return res.status(403).json({ message: "This task is not open to the volunteer network" });
    }

    const existingApplication = task.applications.find(
      (application) => String(application.volunteer) === String(volunteerId)
    );

    if (existingApplication) {
      return res.status(409).json({ message: "You have already accepted this task" });
    }

    task.applications.push({
      volunteer: volunteer._id,
      volunteerName: volunteer.name,
      volunteerEmail: volunteer.email,
      volunteerSkills: volunteer.skills || [],
      status: "accepted",
      appliedAt: new Date(),
    });

    await task.save();

    const ngo = task.ngoId
      ? await User.findById(task.ngoId).select("email name organizationName")
      : null;

    await Notification.create({
      type: "system",
      recipientEmail: ngo?.email || volunteer.email,
      recipientName: ngo?.organizationName || ngo?.name || volunteer.name,
      subject: "Volunteer accepted task",
      message: `${volunteer.name} accepted the task "${task.title}".`,
      status: "sent",
      taskId: task._id,
      ngoId: task.ngoId,
      metadata: {
        volunteerId: String(volunteer._id),
      },
    });

    return res.json({
      message: "Task accepted. The NGO can now review your interest and assign you.",
      task: serializeTask(task, volunteerId),
    });
  } catch (error) {
    return res.status(500).json({ message: "Unable to accept task right now" });
  }
}

async function requestTaskCompletion(req, res) {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    const isAssignedVolunteer =
      task.assignedVolunteer && String(task.assignedVolunteer.volunteer) === String(req.user.id);

    if (!isAssignedVolunteer) {
      return res.status(403).json({ message: "You do not have permission to request completion for this task" });
    }

    if (task.status !== "assigned") {
      return res.status(400).json({ message: "Only active assigned tasks can be submitted for admin verification" });
    }

    const ngo = await User.findById(task.ngoId).select("email name organizationName");

    task.status = "completion_requested";
    task.completionRequestedAt = new Date();
    await task.save();

    await Notification.create({
      type: "system",
      recipientEmail: ngo?.email || req.user.email || "noreply@sevalink.local",
      recipientName: ngo?.organizationName || ngo?.name || "",
      subject: "Volunteer requested task completion review",
      message: `${task.assignedVolunteer?.volunteerName || "A volunteer"} marked "${task.title}" as completed and requested admin verification.`,
      status: "sent",
      taskId: task._id,
      ngoId: task.ngoId,
      metadata: {
        volunteerId: String(req.user.id),
      },
    });

    return res.json({
      message: "Completion request sent to the admin for verification.",
      task: serializeTask(task, req.user.id),
    });
  } catch (error) {
    return res.status(500).json({ message: "Unable to request task completion" });
  }
}

async function runTaskMatching(req, res) {
  try {
    const task = await Task.findById(getTaskIdFromRequest(req));
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    if (!ownsTask(task, req.user.id)) {
      return res.status(403).json({ message: "This task belongs to another NGO" });
    }

    const rankedVolunteers = await getRankedVolunteersForTask(task);
    task.matchedVolunteers = rankedVolunteers;
    await task.save();

    return res.json({
      message: "Advanced matching completed",
      task: serializeTask(task),
    });
  } catch (error) {
    return res.status(500).json({ message: "Unable to run task matching" });
  }
}

async function assignTask(req, res) {
  try {
    const { volunteerId, score } = req.body;
    if (!volunteerId) {
      return res.status(400).json({ message: "Volunteer selection is required" });
    }

    const [task, volunteer, activeAssignmentMap] = await Promise.all([
      Task.findById(getTaskIdFromRequest(req)),
      User.findOne({ _id: volunteerId, role: "Volunteer" }).select(
        "name email skills location availability availabilityScore geoLocation rating points badges tasksCompleted notificationsEnabled"
      ),
      buildActiveAssignmentMap(),
    ]);

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    if (!ownsTask(task, req.user.id)) {
      return res.status(403).json({ message: "This task belongs to another NGO" });
    }

    if (!volunteer) {
      return res.status(404).json({ message: "Volunteer not found" });
    }

    if (volunteer.availability === false || (activeAssignmentMap[String(volunteer._id)] || 0) > 0) {
      return res.status(400).json({ message: "Selected volunteer is currently unavailable" });
    }

    const matchPayload = rankVolunteersForTask(task, [volunteer], activeAssignmentMap)[0];
    if (typeof score === "number") {
      matchPayload.matchScore = Number(score.toFixed(1));
    }
    applyAssignment(task, volunteer, matchPayload);
    await task.save();

    notifyVolunteerAssignment(task, volunteer).catch(() => undefined);

    return res.json({
      message: "Task assigned successfully",
      task: serializeTask(task),
    });
  } catch (error) {
    return res.status(500).json({ message: "Unable to assign volunteer" });
  }
}

async function optimizeAssignment(req, res) {
  return res.status(403).json({
    message: "Automatic assignment is disabled. Review matches and assign volunteers manually.",
  });
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
    const isAdmin = req.user.role === "NGO" && ownsTask(task, req.user.id);

    if (!isAssignedVolunteer && !isAdmin) {
      return res.status(403).json({ message: "You do not have permission to complete this task" });
    }

    if (req.user.role === "Volunteer") {
      return res.status(403).json({
        message: "Volunteers must submit completion for admin verification first.",
      });
    }

    task.status = "completed";
    task.completedAt = new Date();
    await task.save();

    if (task.assignedVolunteer?.volunteer) {
      const volunteer = await User.findById(task.assignedVolunteer.volunteer);
      if (volunteer) {
        await awardCompletionRewards(volunteer, task);
        await volunteer.save();
      }
    }

    return res.json({
      message: "Task marked as completed",
      task: serializeTask(task, req.user.id),
    });
  } catch (error) {
    return res.status(500).json({ message: "Unable to complete task" });
  }
}

module.exports = {
  applyForTask,
  assignTask,
  completeTask,
  confirmAssignedTask,
  createTask,
  getAdminDashboard,
  getMatchedVolunteers,
  getTasks,
  getVolunteerDashboard,
  optimizeAssignment,
  requestTaskCompletion,
  runTaskMatching,
};
