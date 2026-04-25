const Notification = require("../models/Notification");
const Task = require("../models/Task");
const User = require("../models/User");
const {
  buildHeatmapPoints,
  buildLeaderboard,
  buildPredictionReport,
} = require("../services/analyticsService");

async function getNeedPredictions(req, res) {
  try {
    const tasks = await Task.find({ ngoId: req.user.id }).sort({ createdAt: -1 });

    return res.json(buildPredictionReport(tasks));
  } catch (error) {
    return res.status(500).json({ message: "Unable to generate need predictions" });
  }
}

async function getLeaderboard(req, res) {
  try {
    const volunteers = await User.find({ role: "Volunteer" })
      .select("name email points badges tasksCompleted")
      .sort({ points: -1, tasksCompleted: -1 });

    return res.json({
      leaderboard: buildLeaderboard(volunteers),
    });
  } catch (error) {
    return res.status(500).json({ message: "Unable to load leaderboard" });
  }
}

async function getRecentNotifications(req, res) {
  try {
    const notifications = await Notification.find({ ngoId: req.user.id })
      .sort({ createdAt: -1 })
      .limit(8)
      .lean();

    return res.json({ notifications });
  } catch (error) {
    return res.status(500).json({ message: "Unable to load notifications" });
  }
}

async function getHeatmap(req, res) {
  try {
    const tasks = await Task.find({
      ngoId: req.user.id,
      status: { $in: ["open", "pending_confirmation", "assigned", "completion_requested", "completed"] },
    }).sort({ createdAt: -1 });

    return res.json({
      points: buildHeatmapPoints(tasks),
    });
  } catch (error) {
    return res.status(500).json({ message: "Unable to load heatmap data" });
  }
}

module.exports = {
  getHeatmap,
  getLeaderboard,
  getNeedPredictions,
  getRecentNotifications,
};
