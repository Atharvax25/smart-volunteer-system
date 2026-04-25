const crypto = require("crypto");
const User = require("../models/User");
const { sendPasswordResetOtp } = require("../services/notificationService");
const { normalizeGeoPoint, toNumber } = require("../utils/geo");
const { normalizeSkills } = require("../utils/skills");
const { hashPassword, verifyPassword, signToken } = require("../utils/auth");

const PASSWORD_RESET_OTP_TTL_MS = 1000 * 60 * 10;

function hashOtpCode(otpCode) {
  return crypto.createHash("sha256").update(String(otpCode)).digest("hex");
}

function createOtpCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function sanitizeUser(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    organizationName: user.organizationName || "",
    location: user.location || "",
    availability: user.availability !== false,
    skills: user.skills || [],
    availabilityScore: user.availabilityScore ?? 0.75,
    rating: user.rating ?? 4,
    geoLocation: user.geoLocation || { lat: null, lng: null },
    points: user.points || 0,
    badges: user.badges || [],
    tasksCompleted: user.tasksCompleted || 0,
  };
}

async function register(req, res) {
  try {
    const {
      name,
      email,
      password,
      role,
      skills,
      organizationName,
      availabilityScore,
      latitude,
      longitude,
    } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "Name, email, and password are required" });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    const normalizedRole = role === "NGO" ? "NGO" : "Volunteer";
    const normalizedSkills = normalizeSkills(skills);
    const normalizedGeoLocation = normalizeGeoPoint(latitude, longitude);
    const parsedAvailabilityScore = toNumber(availabilityScore);

    if (normalizedRole === "Volunteer" && normalizedSkills.length === 0) {
      return res.status(400).json({ message: "Volunteer skills are required for registration" });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(409).json({ message: "An account with this email already exists" });
    }

    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      passwordHash: hashPassword(password),
      role: normalizedRole,
      organizationName: String(organizationName || (normalizedRole === "NGO" ? name : ""))
        .trim(),
      location: normalizedRole === "Volunteer" ? String(req.body.location || "").trim() : "",
      availability: normalizedRole === "Volunteer",
      skills: normalizedRole === "Volunteer" ? normalizedSkills : [],
      availabilityScore:
        normalizedRole === "Volunteer" && parsedAvailabilityScore !== null
          ? Math.max(0, Math.min(1, parsedAvailabilityScore))
          : 0.75,
      rating: normalizedRole === "Volunteer" ? 4 : 0,
      geoLocation: normalizedGeoLocation || { lat: null, lng: null },
    });

    const safeUser = sanitizeUser(user);
    const token = signToken(safeUser);

    return res.status(201).json({
      message: "Registration successful",
      token,
      user: safeUser,
    });
  } catch (error) {
    return res.status(500).json({ message: "Unable to register user" });
  }
}

async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });
    if (!user || !verifyPassword(password, user.passwordHash)) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const safeUser = sanitizeUser(user);
    const token = signToken(safeUser);

    return res.json({
      message: "Login successful",
      token,
      user: safeUser,
    });
  } catch (error) {
    return res.status(500).json({ message: "Unable to log in" });
  }
}

async function me(req, res) {
  try {
    const user = await User.findById(req.user.id).select(
      "name email role skills organizationName location availability availabilityScore rating geoLocation points badges tasksCompleted"
    );
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.json({ user: sanitizeUser(user) });
  } catch (error) {
    return res.status(500).json({ message: "Unable to fetch user profile" });
  }
}

async function requestPasswordReset(req, res) {
  try {
    const normalizedEmail = String(req.body.email || "")
      .toLowerCase()
      .trim();

    if (!normalizedEmail) {
      return res.status(400).json({ message: "Email is required" });
    }

    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.json({
        message: "If that email is registered, a reset code has been sent.",
      });
    }

    const otpCode = createOtpCode();
    user.passwordResetOtpHash = hashOtpCode(otpCode);
    user.passwordResetOtpExpiresAt = new Date(Date.now() + PASSWORD_RESET_OTP_TTL_MS);
    await user.save();

    await sendPasswordResetOtp(user, otpCode);

    return res.json({
      message: "If that email is registered, a reset code has been sent.",
    });
  } catch (error) {
    return res.status(500).json({ message: "Unable to send reset code" });
  }
}

async function resetPassword(req, res) {
  try {
    const normalizedEmail = String(req.body.email || "")
      .toLowerCase()
      .trim();
    const otpCode = String(req.body.otp || "").trim();
    const password = String(req.body.password || "");

    if (!normalizedEmail || !otpCode || !password) {
      return res.status(400).json({ message: "Email, code, and new password are required" });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    const user = await User.findOne({ email: normalizedEmail });
    if (!user || !user.passwordResetOtpHash || !user.passwordResetOtpExpiresAt) {
      return res.status(400).json({ message: "Invalid or expired reset code" });
    }

    const isExpired = new Date(user.passwordResetOtpExpiresAt).getTime() < Date.now();
    const otpMatches = user.passwordResetOtpHash === hashOtpCode(otpCode);

    if (isExpired || !otpMatches) {
      return res.status(400).json({ message: "Invalid or expired reset code" });
    }

    user.passwordHash = hashPassword(password);
    user.passwordResetOtpHash = "";
    user.passwordResetOtpExpiresAt = null;
    await user.save();

    return res.json({ message: "Password reset successful. You can now log in." });
  } catch (error) {
    return res.status(500).json({ message: "Unable to reset password" });
  }
}

module.exports = {
  register,
  login,
  me,
  requestPasswordReset,
  resetPassword,
  normalizeSkills,
};
