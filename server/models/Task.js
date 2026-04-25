const mongoose = require("mongoose");

const applicationSchema = new mongoose.Schema(
  {
    volunteer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    volunteerName: {
      type: String,
      required: true,
      trim: true,
    },
    volunteerEmail: {
      type: String,
      required: true,
      trim: true,
    },
    volunteerSkills: {
      type: [String],
      default: [],
    },
    status: {
      type: String,
      enum: ["pending", "accepted", "rejected"],
      default: "pending",
    },
    appliedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const volunteerRefSchema = new mongoose.Schema(
  {
    volunteer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    volunteerName: {
      type: String,
      required: true,
      trim: true,
    },
    volunteerEmail: {
      type: String,
      required: true,
      trim: true,
    },
    volunteerSkills: {
      type: [String],
      default: [],
    },
    matchedSkills: {
      type: [String],
      default: [],
    },
    matchScore: {
      type: Number,
      default: 0,
    },
    skillMatchScore: {
      type: Number,
      default: 0,
    },
    distanceScore: {
      type: Number,
      default: 0,
    },
    availabilityScore: {
      type: Number,
      default: 0,
    },
    performanceScore: {
      type: Number,
      default: 0,
    },
    distanceKm: {
      type: Number,
      default: null,
    },
    activeAssignments: {
      type: Number,
      default: 0,
    },
  },
  { _id: false }
);

const taskSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    location: {
      type: String,
      required: true,
      trim: true,
    },
    mapLink: {
      type: String,
      default: "",
      trim: true,
    },
    geoLocation: {
      lat: {
        type: Number,
        default: null,
      },
      lng: {
        type: Number,
        default: null,
      },
    },
    severity: {
      type: String,
      enum: ["low", "medium", "high", "critical"],
      default: "medium",
    },
    urgencyScore: {
      type: Number,
      default: 56,
    },
    category: {
      type: String,
      default: "General support",
      trim: true,
    },
    imageUrl: {
      type: String,
      default: "",
      trim: true,
    },
    imageTag: {
      type: String,
      default: "",
      trim: true,
    },
    imageTags: {
      type: [String],
      default: [],
    },
    escalationReason: {
      type: String,
      default: "",
      trim: true,
    },
    ngoId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    sharedVisibility: {
      type: Boolean,
      default: true,
    },
    skills: {
      type: [String],
      default: [],
    },
    status: {
      type: String,
      enum: ["pending", "open", "pending_confirmation", "assigned", "completion_requested", "completed"],
      default: "open",
    },
    assignedTo: {
      type: String,
      default: "",
      trim: true,
    },
    matchingScore: {
      type: Number,
      default: 0,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    reporterName: {
      type: String,
      required: true,
      trim: true,
    },
    assignedVolunteer: {
      type: volunteerRefSchema,
      default: null,
    },
    matchedVolunteers: {
      type: [volunteerRefSchema],
      default: [],
    },
    applications: {
      type: [applicationSchema],
      default: [],
    },
    assignedAt: Date,
    completionRequestedAt: Date,
    completedAt: Date,
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.models.Task || mongoose.model("Task", taskSchema);
