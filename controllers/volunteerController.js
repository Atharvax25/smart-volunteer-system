const Volunteer = require("../models/Volunteer");

exports.registerVolunteer = async (req, res) => {
  try {
    const data = new Volunteer(req.body);
    await data.save();

    res.json({ message: "Saved successfully", data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};