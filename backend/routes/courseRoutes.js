// routes/courseRoutes.js
const express = require("express");
const router = express.Router();
const {
  createCourse,
  getCoursesByBranch,
  getCoursesForRecruiter,
  deleteCourse,
  toggleLockCourse, // <-- Agregamos el controlador
  updateCourse, // <-- Agregamos el controlador para actualizar curso
} = require("../controllers/courseController");

// Rutas para los cursos
router.get("/", getCoursesForRecruiter); // Obtener cursos para reclutador (publicados)
router.post("/", createCourse); // Crear un curso
router.get("/:branchId", getCoursesByBranch); // Obtener cursos por sucursal
router.delete("/:courseId", deleteCourse); // Eliminar un curso por ID
router.patch("/:courseId/toggle-lock", toggleLockCourse); // Ruta para bloquear/desbloquear curso
router.put("/:courseId", updateCourse); // Ruta para actualizar curso

module.exports = router;