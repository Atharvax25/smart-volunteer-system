const Volunteer = require("../models/volunteer");

// SAVE DATA
exports.registerVolunteer = async (req, res) => {
  try {
    const newVolunteer = new Volunteer(req.body);
    await newVolunteer.save();

    res.status(201).json({
      message: "Volunteer Registered Successfully",
      data: newVolunteer
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};