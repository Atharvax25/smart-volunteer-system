const express = require("express");
const router = express.Router();
const { registerVolunteer } = require("c:/Users/asd/OneDrive/Desktop/smart-volunteer-system/server/Controllers/volunteerController.js");

router.post("/register", registerVolunteer);

module.exports = router;