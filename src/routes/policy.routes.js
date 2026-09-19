const express = require("express");

const {
  searchPoliciesByUsername,
} = require("../controllers/policy.controller");

const router = express.Router();

router.get("/search", searchPoliciesByUsername);

module.exports = router;