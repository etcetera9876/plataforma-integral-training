const express = require("express");
const router = express.Router();
const { getBranches, createBranch } = require("../controllers/branchController");

router.get("/", getBranches);
router.post("/", createBranch);


module.exports = router;
