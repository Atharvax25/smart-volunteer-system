const express = require("express");
const mongoose = require("mongoose");

mongoose.set("strictQuery", false);

const app = express();
app.use(express.json());

// CONNECT DATABASE
mongoose.connect("mongodb://127.0.0.1:27017/VolunteerDB", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log("✅ MongoDB Connected");

  // 🚀 START SERVER ONLY AFTER DB CONNECTS
  app.listen(5000, () => {
    console.log("Server started on port 5000");
  });
})
.catch(err => console.log("❌ DB Error:", err));

// ROUTES
app.use("/api/volunteers", require("./routes/volunteerRoutes"));