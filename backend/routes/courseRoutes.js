// routes/courseRoutes.js
const express = require("express");
const router = express.Router();
const { createCourse, getCoursesByBranch, getCoursesForRecruiter } = require("../controllers/courseController");


// Si tienes authMiddleware, lo puedes usar así:
//const authMiddleware = require("../middlewares/authMiddleware");

console.log({ createCourse, getCoursesByBranch, getCoursesForRecruiter }); // Depuración

router.get("/", getCoursesForRecruiter);
router.post("/", /*authMiddleware,*/ createCourse);
router.get("/:branchId", getCoursesByBranch);

module.exports = router;
