require("./utils/loadEnv");

const fs = require("fs");
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const path = require("path");

const authRoutes = require("./routes/authRoutes");
const analyticsRoutes = require("./routes/analyticsRoutes");
const chatRoutes = require("./routes/chatRoutes");
const taskRoutes = require("./routes/taskRoutes");

const app = express();
const PORT = process.env.PORT || 5000;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || "http://localhost:3000";
const MONGO_URI = process.env.MONGO_URI;

function isAllowedOrigin(origin) {
  if (!origin) {
    return true;
  }

  if (origin === CLIENT_ORIGIN) {
    return true;
  }

  return /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin);
}

app.use(
  cors({
    origin(origin, callback) {
      if (isAllowedOrigin(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error("CORS origin not allowed"));
    },
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.get("/api/health", (req, res) => {
  res.json({ message: "Samadhan Setu backend running" });
});

app.use("/api/auth", authRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/tasks", taskRoutes);

const clientBuildPath = path.resolve(__dirname, "../client/build");
const clientIndexPath = path.join(clientBuildPath, "index.html");

if (fs.existsSync(clientIndexPath)) {
  app.use(express.static(clientBuildPath));
  app.get(/^\/(?!api(?:\/|$)|uploads(?:\/|$)).*/, (req, res) => {
    res.sendFile(clientIndexPath);
  });
} else {
  app.get("/", (req, res) => {
    res.json({ message: "Samadhan Setu backend running" });
  });
}

async function startServer() {
  if (!MONGO_URI) {
    console.error(
      "Missing MONGO_URI. Add your MongoDB Atlas connection string to server/.env."
    );
    process.exit(1);
  }

  try {
    await mongoose.connect(MONGO_URI);
    console.log("MongoDB connected");
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("MongoDB connection error", error.message);
    process.exit(1);
  }
}

startServer();
