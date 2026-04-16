const User = require("../models/User");
const { hashPassword, verifyPassword, signToken } = require("../utils/auth");

function normalizeSkills(skillsInput) {
  if (Array.isArray(skillsInput)) {
    return [...new Set(skillsInput.map((skill) => String(skill).trim().toLowerCase()).filter(Boolean))];
  }

  return [...new Set(String(skillsInput || "")
    .split(",")
    .map((skill) => skill.trim().toLowerCase())
    .filter(Boolean))];
}

function sanitizeUser(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    skills: user.skills || [],
  };
}

async function register(req, res) {
  try {
    const { name, email, password, role, skills } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "Name, email, and password are required" });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    const normalizedRole = role === "NGO" ? "NGO" : "Volunteer";
    const normalizedSkills = normalizeSkills(skills);

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
      skills: normalizedRole === "Volunteer" ? normalizedSkills : [],
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
    const user = await User.findById(req.user.id).select("name email role skills");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.json({ user: sanitizeUser(user) });
  } catch (error) {
    return res.status(500).json({ message: "Unable to fetch user profile" });
  }
}

module.exports = {
  register,
  login,
  me,
  normalizeSkills,
};
