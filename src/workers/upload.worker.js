const { parentPort, workerData } = require("worker_threads");
const fs = require("fs");
const csv = require("csv-parser");

const rows = [];

fs.createReadStream(workerData.filePath)
  .pipe(csv())
  .on("data", (row) => {
    rows.push(row);
  })
  .on("end", () => {
    parentPort.postMessage({
      success: true,
      totalRows: rows.length,
      rows,
    });
  })
  .on("error", (error) => {
    parentPort.postMessage({
      success: false,
      error: error.message,
    });
  });