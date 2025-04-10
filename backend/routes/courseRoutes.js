// routes/courseRoutes.js
const express = require("express");
const router = express.Router();
const {
  createCourse,
  getCoursesByBranch,
  getCoursesForRecruiter,
} = require("../controllers/courseController");

// Rutas para los cursos
router.get("/", getCoursesForRecruiter); // Obtener cursos para reclutador (publicados)
router.post("/", createCourse); // Crear un curso
router.get("/:branchId", getCoursesByBranch); // Obtener cursos por sucursal

module.exports = router;