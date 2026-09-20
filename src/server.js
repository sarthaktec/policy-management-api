require("dotenv").config();

const app = require("./app");
const connectDB = require("./config/db");
const { startCpuMonitor } = require("./services/cpuMonitor.service");
const {
  startMessageScheduler,
} = require("./services/messageScheduler.service");

const PORT = process.env.PORT || 3000;

const startServer = async () => {
  await connectDB();

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });

  startCpuMonitor();
  startMessageScheduler();
};

startServer();