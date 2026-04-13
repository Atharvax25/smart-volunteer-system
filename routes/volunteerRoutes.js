const express = require("express");
const router = express.Router();
const { registerVolunteer } = require("../controllers/volunteerController");

router.post("/register", registerVolunteer);

module.exports = router;