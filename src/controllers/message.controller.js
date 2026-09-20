const ScheduledMessage = require("../models/ScheduledMessage");

const scheduleMessage = async (req, res) => {
  try {
    const { message, date, time } = req.body;

    // Validate required fields
    if (!message || !date || !time) {
      return res.status(400).json({
        success: false,
        message: "message, date and time are required",
      });
    }

    // Convert date + time into JavaScript Date
    const scheduledAt = new Date(`${date}T${time}:00+05:30`);

    // Validate date
    if (Number.isNaN(scheduledAt.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Invalid date or time",
      });
    }

    // Don't allow scheduling in the past
    if (scheduledAt <= new Date()) {
      return res.status(400).json({
        success: false,
        message: "Scheduled time must be in the future",
      });
    }

    const scheduledMessage = await ScheduledMessage.create({
      message: message.trim(),
      scheduledAt,
    });

    return res.status(201).json({
      success: true,
      message: "Message scheduled successfully",
      data: scheduledMessage,
    });
  } catch (error) {
    console.error("Schedule message error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to schedule message",
      error: error.message,
    });
  }
};

module.exports = {
  scheduleMessage,
};