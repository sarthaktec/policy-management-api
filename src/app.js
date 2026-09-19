const express = require("express");

const uploadRoutes = require("./routes/upload.routes");
const policyRoutes = require("./routes/policy.routes");

const app = express();

app.use(express.json());

app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Policy Management API is running",
  });
});

app.use("/api/upload", uploadRoutes);
app.use("/api/policies", policyRoutes);

module.exports = app;