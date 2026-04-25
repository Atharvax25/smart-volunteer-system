const express = require("express");
const {
  login,
  me,
  register,
  requestPasswordReset,
  resetPassword,
} = require("../controllers/authController");
const { requireAuth } = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.post("/forgot-password", requestPasswordReset);
router.post("/reset-password", resetPassword);
router.get("/me", requireAuth, me);

module.exports = router;
