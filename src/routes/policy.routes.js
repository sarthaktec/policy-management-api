const express = require("express");

const {
  searchPoliciesByUsername,
  aggregatePoliciesByUser,
} = require("../controllers/policy.controller");

const router = express.Router();

router.get("/search", searchPoliciesByUsername);
router.get("/aggregate", aggregatePoliciesByUser);

module.exports = router;