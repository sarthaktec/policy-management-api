const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { Worker } = require("worker_threads");

const { importPolicies } = require("../services/import.service");

const router = express.Router();

const allowedExtensions = [".csv", ".xlsx"];

const upload = multer({
  dest: "uploads/",

  fileFilter: (req, file, cb) => {
    const extension = path
      .extname(file.originalname)
      .toLowerCase();

    if (!allowedExtensions.includes(extension)) {
      return cb(
        new Error("Only CSV and XLSX files are allowed")
      );
    }

    cb(null, true);
  },
});

router.post("/", upload.single("file"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message:
        "Please upload a CSV or XLSX file using the 'file' field",
    });
  }

  const filePath = path.resolve(req.file.path);

  const worker = new Worker(
    path.resolve(__dirname, "../workers/upload.worker.js"),
    {
      workerData: {
        filePath,
        originalName: req.file.originalname,
      },
    }
  );

  worker.on("message", async (result) => {
    try {
      if (!result.success) {
        return res.status(500).json({
          success: false,
          message: result.error,
        });
      }

      const importResult = await importPolicies(result.rows);

      return res.status(200).json({
        success: true,
        message: "File processed successfully",
        totalRows: result.totalRows,
        imported: importResult,
      });
    } catch (error) {
      console.error("Import error:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to import file",
        error: error.message,
      });
    } finally {
      try {
        fs.unlinkSync(filePath);
        console.log("Temporary upload file deleted");
      } catch (error) {
        console.error(
          "Failed to delete temporary upload:",
          error.message
        );
      }
    }
  });

  worker.on("error", (error) => {
    console.error("Worker error:", error);

    try {
      fs.unlinkSync(filePath);
    } catch (cleanupError) {
      console.error(
        "Failed to delete uploaded file:",
        cleanupError.message
      );
    }

    return res.status(500).json({
      success: false,
      message: "Worker failed",
      error: error.message,
    });
  });

  worker.on("exit", (code) => {
    if (code !== 0) {
      console.error(
        `Worker stopped with exit code ${code}`
      );
    }
  });
});

module.exports = router;