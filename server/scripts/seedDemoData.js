require("../utils/loadEnv");

const mongoose = require("mongoose");
const Notification = require("../models/Notification");
const Task = require("../models/Task");
const User = require("../models/User");
const { hashPassword } = require("../utils/auth");

const DEMO_TASK_PREFIX = "Samadhan Setu Demo:";
const DEMO_VOLUNTEER_EMAIL_PATTERN = /^demo\.volunteer\d+@samadhan-setu\.local$/;
const DEMO_NGO_EMAIL_PATTERN = /^demo\.ngo\d+@samadhan-setu\.local$/;
const DEMO_PASSWORD = "demo123456";

const cities = [
  { name: "Mumbai", lat: 19.076, lng: 72.8777 },
  { name: "Pune", lat: 18.5204, lng: 73.8567 },
  { name: "Nashik", lat: 19.9975, lng: 73.7898 },
  { name: "Nagpur", lat: 21.1458, lng: 79.0882 },
  { name: "Bengaluru", lat: 12.9716, lng: 77.5946 },
  { name: "Hyderabad", lat: 17.385, lng: 78.4867 },
  { name: "Ahmedabad", lat: 23.0225, lng: 72.5714 },
  { name: "Jaipur", lat: 26.9124, lng: 75.7873 },
];

const skillCatalog = [
  "medical",
  "food distribution",
  "teaching",
  "logistics",
  "rescue support",
  "counselling",
  "documentation",
  "community outreach",
  "transport",
  "event coordination",
  "elder care",
  "fundraising",
];

const badgeCatalog = [
  "Rapid Responder",
  "Community Anchor",
  "Relief Runner",
  "Mentor",
  "Field Expert",
];

const taskBlueprints = [
  { title: "Flood relief supply routing", category: "Logistics", severity: "critical" },
  { title: "Community food packet distribution", category: "Food support", severity: "high" },
  { title: "Weekend health camp support", category: "Medical support", severity: "medium" },
  { title: "School mentorship outreach", category: "Education", severity: "low" },
  { title: "Emergency shelter intake desk", category: "Shelter", severity: "critical" },
  { title: "Senior citizen home visits", category: "Wellbeing", severity: "medium" },
  { title: "Transport coordination for supplies", category: "Transport", severity: "high" },
  { title: "Volunteer onboarding desk", category: "Operations", severity: "low" },
];

function pick(list, index) {
  return list[index % list.length];
}

function createSkillSet(index) {
  return [
    pick(skillCatalog, index),
    pick(skillCatalog, index + 3),
    pick(skillCatalog, index + 6),
  ].filter((value, itemIndex, array) => array.indexOf(value) === itemIndex);
}

function createVolunteerReference(volunteer, index) {
  return {
    volunteer: volunteer._id,
    volunteerName: volunteer.name,
    volunteerEmail: volunteer.email,
    volunteerSkills: volunteer.skills,
    matchedSkills: volunteer.skills.slice(0, 2),
    matchScore: 82 - (index % 6) * 4,
    skillMatchScore: 30 - (index % 3) * 3,
    distanceScore: 24 - (index % 4) * 2,
    availabilityScore: Number((volunteer.availabilityScore || 0).toFixed(2)),
    performanceScore: Math.min(25, 8 + Math.floor((volunteer.points || 0) / 25)),
    distanceKm: 3 + (index % 5) * 4,
    activeAssignments: index % 3,
  };
}

async function ensureNgoAccounts() {
  const existingNgos = await User.find({ role: "NGO" }).sort({ createdAt: 1 });
  const ngoAccounts = [...existingNgos];

  for (let index = ngoAccounts.length; index < 3; index += 1) {
    const nextNgo = await User.create({
      name: `Demo NGO ${index + 1}`,
      email: `demo.ngo${index + 1}@samadhan-setu.local`,
      passwordHash: hashPassword(DEMO_PASSWORD),
      role: "NGO",
      organizationName: `Demo NGO ${index + 1}`,
    });
    ngoAccounts.push(nextNgo);
  }

  return ngoAccounts;
}

async function resetDemoRecords() {
  await Notification.deleteMany({ "metadata.demoSeed": true });
  await Task.deleteMany({ title: { $regex: `^${DEMO_TASK_PREFIX}` } });
  await User.deleteMany({ email: { $regex: DEMO_VOLUNTEER_EMAIL_PATTERN } });

  const demoNgoIds = (
    await User.find({ email: { $regex: DEMO_NGO_EMAIL_PATTERN } }).select("_id")
  ).map((ngo) => ngo._id);

  if (demoNgoIds.length) {
    await User.deleteMany({ _id: { $in: demoNgoIds } });
  }
}

async function createVolunteers() {
  const volunteers = [];

  for (let index = 0; index < 48; index += 1) {
    const city = pick(cities, index);
    const volunteer = await User.create({
      name: `Demo Volunteer ${index + 1}`,
      email: `demo.volunteer${index + 1}@samadhan-setu.local`,
      passwordHash: hashPassword(DEMO_PASSWORD),
      role: "Volunteer",
      skills: createSkillSet(index),
      location: city.name,
      availability: index % 5 !== 0,
      availabilityScore: Number((0.45 + (index % 6) * 0.1).toFixed(2)),
      geoLocation: {
        lat: Number((city.lat + ((index % 5) - 2) * 0.03).toFixed(4)),
        lng: Number((city.lng + ((index % 4) - 1.5) * 0.03).toFixed(4)),
      },
      rating: Number((3.6 + (index % 5) * 0.28).toFixed(1)),
      points: 120 + index * 11,
      badges: index % 3 === 0 ? [pick(badgeCatalog, index)] : [],
      tasksCompleted: 2 + (index % 9),
    });

    volunteers.push(volunteer);
  }

  return volunteers;
}

async function createTasks(ngos, volunteers) {
  const tasks = [];
  const now = Date.now();

  for (let index = 0; index < 48; index += 1) {
    const blueprint = pick(taskBlueprints, index);
    const city = pick(cities, index);
    const ngo = ngos[index % ngos.length];
    const ownerMatches = volunteers.slice(index % 12, (index % 12) + 5).map((volunteer, matchIndex) =>
      createVolunteerReference(volunteer, matchIndex + index)
    );
    const selectedVolunteer = volunteers[(index * 3) % volunteers.length];
    const createdAt = new Date(now - (index % 14) * 24 * 60 * 60 * 1000 - index * 45 * 60 * 1000);

    let status = "open";
    if (index >= 22 && index < 32) {
      status = "pending_confirmation";
    } else if (index >= 32 && index < 42) {
      status = "assigned";
    } else if (index >= 42) {
      status = "completed";
    }

    const applications = ownerMatches.slice(0, 3).map((match, applicationIndex) => ({
      volunteer: match.volunteer,
      volunteerName: match.volunteerName,
      volunteerEmail: match.volunteerEmail,
      volunteerSkills: match.volunteerSkills,
      status:
        status === "open"
          ? applicationIndex === 0
            ? "pending"
            : "rejected"
          : String(match.volunteer) === String(selectedVolunteer._id)
            ? "accepted"
            : "rejected",
      appliedAt: new Date(createdAt.getTime() + (applicationIndex + 1) * 60 * 60 * 1000),
    }));

    const assignedVolunteer =
      status === "open"
        ? null
        : createVolunteerReference(selectedVolunteer, index + 2);

    const task = await Task.create({
      title: `${DEMO_TASK_PREFIX} ${blueprint.title} ${index + 1}`,
      description:
        "Demo task generated to populate the admin dashboard with realistic coordination data, volunteer matches, and operational states.",
      location: `${city.name} Relief Zone ${1 + (index % 6)}`,
      geoLocation: {
        lat: Number((city.lat + ((index % 4) - 1.5) * 0.04).toFixed(4)),
        lng: Number((city.lng + ((index % 5) - 2) * 0.04).toFixed(4)),
      },
      severity: blueprint.severity,
      urgencyScore: Math.min(98, 52 + (index % 8) * 6),
      category: blueprint.category,
      imageUrl: "",
      imageTag: "",
      imageTags: [],
      escalationReason:
        blueprint.severity === "critical"
          ? "Critical urgency triggered by clustered demand and limited nearby capacity."
          : "",
      ngoId: ngo._id,
      sharedVisibility: index % 5 !== 0,
      skills: createSkillSet(index),
      status,
      assignedTo: assignedVolunteer?.volunteerName || "",
      matchingScore: assignedVolunteer?.matchScore || 0,
      createdBy: ngo._id,
      reporterName: ngo.organizationName || ngo.name,
      assignedVolunteer,
      matchedVolunteers: ownerMatches,
      applications,
      assignedAt: status === "open" ? null : new Date(createdAt.getTime() + 6 * 60 * 60 * 1000),
      completedAt:
        status === "completed"
          ? new Date(createdAt.getTime() + 36 * 60 * 60 * 1000)
          : null,
      createdAt,
      updatedAt: new Date(createdAt.getTime() + 2 * 60 * 60 * 1000),
    });

    tasks.push(task);
  }

  return tasks;
}

async function createNotifications(ngos, tasks) {
  const notificationDocs = [];

  ngos.forEach((ngo, ngoIndex) => {
    const ngoTasks = tasks.filter((task) => String(task.ngoId) === String(ngo._id)).slice(0, 6);

    ngoTasks.forEach((task, taskIndex) => {
      notificationDocs.push({
        type: task.status === "open" ? "nearby_alert" : "assignment",
        channel: "email",
        recipientEmail: ngo.email,
        recipientName: ngo.organizationName || ngo.name,
        subject: `Demo update: ${task.title}`,
        message: `Dashboard seed notification for ${task.title} in ${task.location}.`,
        status: taskIndex % 4 === 0 ? "queued" : "sent",
        taskId: task._id,
        ngoId: ngo._id,
        metadata: {
          demoSeed: true,
          ngoIndex,
        },
      });
    });
  });

  if (notificationDocs.length) {
    await Notification.insertMany(notificationDocs);
  }
}

async function main() {
  if (!process.env.MONGO_URI) {
    throw new Error("Missing MONGO_URI in server/.env");
  }

  await mongoose.connect(process.env.MONGO_URI);

  try {
    await resetDemoRecords();

    const ngos = await ensureNgoAccounts();
    const volunteers = await createVolunteers();
    const tasks = await createTasks(ngos, volunteers);
    await createNotifications(ngos, tasks);

    console.log(`Demo seed complete: ${ngos.length} NGOs, ${volunteers.length} volunteers, ${tasks.length} tasks.`);
    console.log(`Demo login password for generated accounts: ${DEMO_PASSWORD}`);
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
