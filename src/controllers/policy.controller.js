const User = require("../models/Users");
const Policy = require("../models/Policy");

const searchPoliciesByUsername = async (req, res) => {
  try {
    const { username } = req.query;

    if (!username) {
      return res.status(400).json({
        success: false,
        message: "username query parameter is required",
      });
    }

    const users = await User.find({
      $or: [
        {
          firstName: {
            $regex: username,
            $options: "i",
          },
        },
        {
          email: {
            $regex: username,
            $options: "i",
          },
        },
      ],
    }).select("_id firstName email");

    if (!users.length) {
      return res.status(404).json({
        success: false,
        message: "No user found",
      });
    }

    const userIds = users.map((user) => user._id);

    const policies = await Policy.find({
      userId: {
        $in: userIds,
      },
    })
      .populate("userId", "firstName email")
      .populate("categoryId", "categoryName")
      .populate("companyId", "companyName");

    return res.status(200).json({
      success: true,
      count: policies.length,
      data: policies,
    });
  } catch (error) {
    console.error("Policy search error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to search policies",
      error: error.message,
    });
  }
};

const aggregatePoliciesByUser = async (req, res) => {
  try {
    const result = await Policy.aggregate([
      {
        $group: {
          _id: "$userId",
          totalPolicies: {
            $sum: 1,
          },
        },
      },

      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "user",
        },
      },

      {
        $unwind: "$user",
      },

      {
        $project: {
          _id: 0,
          userId: "$_id",
          firstName: "$user.firstName",
          email: "$user.email",
          totalPolicies: 1,
        },
      },

      {
        $sort: {
          totalPolicies: -1,
        },
      },
    ]);

    return res.status(200).json({
      success: true,
      count: result.length,
      data: result,
    });
  } catch (error) {
    console.error("Policy aggregation error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to aggregate policies",
      error: error.message,
    });
  }
};

module.exports = {
  searchPoliciesByUsername,
  aggregatePoliciesByUser,
};