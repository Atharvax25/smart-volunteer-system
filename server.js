const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");

const app = express();

app.use(cors());
app.use(express.json());

// ✅ connect DB
connectDB();

// ✅ routes
app.use("/api/volunteers", require("./routes/volunteerRoutes"));

app.listen(5000, () => {
  console.log("🚀 Server running on port 5000");
});