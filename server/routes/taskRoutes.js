const express = require("express");
const {
  createTask,
  getTasks,
  getVolunteerDashboard,
  getAdminDashboard,
  applyForTask,
  runTaskMatching,
  assignTask,
  confirmAssignedTask,
  completeTask,
} = require("../controllers/taskController");
const { requireAuth, requireRole } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/", getTasks);
router.get("/volunteer/dashboard", requireAuth, requireRole("Volunteer"), getVolunteerDashboard);
router.get("/admin/dashboard", requireAuth, requireRole("NGO"), getAdminDashboard);
router.post("/", requireAuth, requireRole("NGO"), createTask);
router.post("/:id/apply", requireAuth, requireRole("Volunteer"), applyForTask);
router.post("/:id/run-matching", requireAuth, requireRole("NGO"), runTaskMatching);
router.patch("/:id/assign", requireAuth, requireRole("NGO"), assignTask);
router.patch("/:id/confirm", requireAuth, requireRole("Volunteer"), confirmAssignedTask);
router.patch("/:id/complete", requireAuth, completeTask);

module.exports = router;
