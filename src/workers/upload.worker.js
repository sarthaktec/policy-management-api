const { parentPort, workerData } = require("worker_threads");
const fs = require("fs");
const path = require("path");
const csv = require("csv-parser");
const XLSX = require("xlsx");

const parseCSV = (filePath) => {
  return new Promise((resolve, reject) => {
    const rows = [];

    fs.createReadStream(filePath)
      .pipe(csv())
      .on("data", (row) => {
        rows.push(row);
      })
      .on("end", () => {
        resolve(rows);
      })
      .on("error", reject);
  });
};

const parseXLSX = (filePath) => {
  const workbook = XLSX.readFile(filePath, {
    cellDates: true,
  });

  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];

  return XLSX.utils.sheet_to_json(worksheet);
};

const processFile = async () => {
  try {
    const extension = path
      .extname(workerData.originalName)
      .toLowerCase();

    let rows;

    if (extension === ".csv") {
      rows = await parseCSV(workerData.filePath);
    } else if (extension === ".xlsx") {
      rows = parseXLSX(workerData.filePath);
    } else {
      throw new Error(
        "Unsupported file type. Only CSV and XLSX are allowed."
      );
    }

    parentPort.postMessage({
      success: true,
      totalRows: rows.length,
      rows,
    });
  } catch (error) {
    parentPort.postMessage({
      success: false,
      error: error.message,
    });
  }
};

processFile();