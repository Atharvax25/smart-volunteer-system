require("../utils/loadEnv");

const mongoose = require("mongoose");
const Notification = require("../models/Notification");
const Task = require("../models/Task");
const User = require("../models/User");

const DEMO_TASK_PREFIX = "SevaLink Demo:";
const DEMO_VOLUNTEER_EMAIL_PATTERN = /^demo\.volunteer\d+@sevalink\.local$/;
const DEMO_NGO_EMAIL_PATTERN = /^demo\.ngo\d+@sevalink\.local$/;

async function main() {
  if (!process.env.MONGO_URI) {
    throw new Error("Missing MONGO_URI in server/.env");
  }

  await mongoose.connect(process.env.MONGO_URI);

  try {
    const demoNgos = await User.find({ email: { $regex: DEMO_NGO_EMAIL_PATTERN } }).select("_id");
    const demoNgoIds = demoNgos.map((ngo) => ngo._id);

    const taskResult = await Task.deleteMany({
      $or: [
        { title: { $regex: `^${DEMO_TASK_PREFIX}` } },
        { createdBy: { $in: demoNgoIds } },
        { ngoId: { $in: demoNgoIds } },
      ],
    });

    const notificationResult = await Notification.deleteMany({
      $or: [
        { "metadata.demoSeed": true },
        { ngoId: { $in: demoNgoIds } },
      ],
    });

    const volunteerResult = await User.deleteMany({
      email: { $regex: DEMO_VOLUNTEER_EMAIL_PATTERN },
    });

    const ngoResult = await User.deleteMany({
      email: { $regex: DEMO_NGO_EMAIL_PATTERN },
    });

    console.log(
      `Removed demo data: ${taskResult.deletedCount} tasks, ${notificationResult.deletedCount} notifications, ${volunteerResult.deletedCount} volunteers, ${ngoResult.deletedCount} NGOs.`
    );
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
