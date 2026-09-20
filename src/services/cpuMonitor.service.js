const os = require("os");

const CPU_THRESHOLD = 70;
const CHECK_INTERVAL = 5000;

const getCpuSnapshot = () => {
  const cpus = os.cpus();

  let idle = 0;
  let total = 0;

  for (const cpu of cpus) {
    idle += cpu.times.idle;

    total +=
      cpu.times.user +
      cpu.times.nice +
      cpu.times.sys +
      cpu.times.idle +
      cpu.times.irq;
  }

  return {
    idle,
    total,
  };
};

const calculateCpuUsage = (previous, current) => {
  const idleDifference = current.idle - previous.idle;
  const totalDifference = current.total - previous.total;

  if (totalDifference === 0) {
    return 0;
  }

  const usage =
    100 - (idleDifference / totalDifference) * 100;

  return Number(usage.toFixed(2));
};

const startCpuMonitor = () => {
  console.log("CPU monitor started");

  let previousSnapshot = getCpuSnapshot();

  setInterval(() => {
    const currentSnapshot = getCpuSnapshot();

    const cpuUsage = calculateCpuUsage(
      previousSnapshot,
      currentSnapshot
    );

    previousSnapshot = currentSnapshot;

    console.log(`CPU usage: ${cpuUsage}%`);

    if (cpuUsage >= CPU_THRESHOLD) {
      console.error(
        `CPU usage exceeded ${CPU_THRESHOLD}%. Restarting server...`
      );

      process.exit(1);
    }
  }, CHECK_INTERVAL);
};

module.exports = {
  startCpuMonitor,
  getCpuSnapshot,
  calculateCpuUsage,
};