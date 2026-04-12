const express = require("express");
const app = express();

// Middleware (VERY IMPORTANT)
app.use(express.json());

// Test route
app.get("/", (req, res) => {
    res.send("Backend running");
});

// Sample POST route
app.post("/add", (req, res) => {
    console.log(req.body);
    res.send("Data received");
});

app.listen(5000, () => {
    console.log("Server started on port 5000");
});