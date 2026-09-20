const ScheduledMessage = require("../models/ScheduledMessage");

const CHECK_INTERVAL = 1000;

const processScheduledMessages = async () => {
  try {
    const now = new Date();

    const messages = await ScheduledMessage.find({
      status: "pending",
      scheduledAt: {
        $lte: now,
      },
    });

    for (const message of messages) {
      message.status = "completed";
      message.processedAt = new Date();

      await message.save();

      console.log(
        `Scheduled message processed: ${message.message}`
      );
    }
  } catch (error) {
    console.error(
      "Scheduled message processing error:",
      error.message
    );
  }
};

const startMessageScheduler = () => {
  console.log("Message scheduler started");

  setInterval(
    processScheduledMessages,
    CHECK_INTERVAL
  );
};

module.exports = {
  startMessageScheduler,
};