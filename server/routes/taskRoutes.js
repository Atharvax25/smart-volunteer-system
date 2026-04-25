const express = require("express");
const {
  createTask,
  getTasks,
  getVolunteerDashboard,
  getAdminDashboard,
  getMatchedVolunteers,
  applyForTask,
  runTaskMatching,
  assignTask,
  optimizeAssignment,
  confirmAssignedTask,
  completeTask,
  requestTaskCompletion,
} = require("../controllers/taskController");
const { requireAuth, requireRole } = require("../middleware/authMiddleware");
const { upload } = require("../middleware/uploadMiddleware");

const router = express.Router();

router.get("/", getTasks);
router.get("/volunteer/dashboard", requireAuth, requireRole("Volunteer"), getVolunteerDashboard);
router.get("/admin/dashboard", requireAuth, requireRole("NGO"), getAdminDashboard);
router.get("/match/:taskId", requireAuth, requireRole("NGO"), getMatchedVolunteers);
router.post("/", requireAuth, requireRole("NGO"), upload.single("image"), createTask);
router.post("/:id/apply", requireAuth, requireRole("Volunteer"), applyForTask);
router.post("/:id/run-matching", requireAuth, requireRole("NGO"), runTaskMatching);
router.post("/:id/optimize-assignment", requireAuth, requireRole("NGO"), optimizeAssignment);
router.patch("/:id/assign", requireAuth, requireRole("NGO"), assignTask);
router.put("/assign/:taskId", requireAuth, requireRole("NGO"), assignTask);
router.patch("/:id/confirm", requireAuth, requireRole("Volunteer"), confirmAssignedTask);
router.patch("/:id/request-complete", requireAuth, requireRole("Volunteer"), requestTaskCompletion);
router.patch("/:id/complete", requireAuth, completeTask);

module.exports = router;
