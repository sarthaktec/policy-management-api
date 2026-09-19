const express = require("express");
const multer = require("multer");
const path = require("path");
const { Worker } = require("worker_threads");
const { importPolicies } = require("../services/import.service");

const router = express.Router();

const upload = multer({
  dest: "uploads/",
});

router.post("/", upload.single("file"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: "Please upload a CSV or XLSX file using the 'file' field",
    });
  }

  const filePath = path.resolve(req.file.path);

  const worker = new Worker(
    path.resolve(__dirname, "../workers/upload.worker.js"),
    {
      workerData: {
        filePath,
      },
    }
  );

  worker.on("message", async (result) => {
    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: result.error,
      });
    }

    const importResult = await importPolicies(result.rows);

    return res.status(200).json({
      success: true,
      message: "CSV processed successfully",
      totalRows: result.totalRows,
      sample: result.rows.slice(0, 2),
      imported: importResult,
    });
  });

  worker.on("error", (error) => {
    console.error("Worker error:", error);

    return res.status(500).json({
      success: false,
      message: "Worker failed",
    });
  });

  worker.on("exit", (code) => {
    if (code !== 0) {
      console.error(`Worker stopped with exit code ${code}`);
    }
  });
});

module.exports = router;