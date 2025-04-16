// routes/courseRoutes.js
const express = require("express");
const router = express.Router();
const {
  createCourse,
  getCoursesByBranch,
  getCoursesForRecruiter,
  deleteCourse,
  toggleLockCourse, // <-- Agregamos el controlador
} = require("../controllers/courseController");

// Rutas para los cursos
router.get("/", getCoursesForRecruiter); // Obtener cursos para reclutador (publicados)
router.post("/", createCourse); // Crear un curso
router.get("/:branchId", getCoursesByBranch); // Obtener cursos por sucursal
router.delete("/:courseId", deleteCourse); // Eliminar un curso por ID
router.patch("/:courseId/toggle-lock", toggleLockCourse); // Ruta para bloquear/desbloquear curso

module.exports = router;