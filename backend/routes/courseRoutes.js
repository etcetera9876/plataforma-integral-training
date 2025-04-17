// routes/courseRoutes.js
const express = require("express");
const router = express.Router();
const multer = require('multer');
const path = require('path');
const {
  createCourse,
  getCoursesByBranch,
  getCoursesForRecruiter,
  deleteCourse,
  toggleLockCourse, // <-- Agregamos el controlador
  updateCourse, // <-- Agregamos el controlador para actualizar curso
  uploadResource, // <-- Agregamos el controlador para subir recursos
} = require("../controllers/courseController");

// Configuración de multer para guardar archivos en /uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '../uploads'));
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + file.originalname.replace(/\s+/g, '_');
    cb(null, uniqueSuffix);
  }
});
const upload = multer({ storage });

// Rutas para los cursos
router.get("/", getCoursesForRecruiter); // Obtener cursos para reclutador (publicados)
router.post("/", createCourse); // Crear un curso
router.get("/:branchId", getCoursesByBranch); // Obtener cursos por sucursal
router.delete("/:courseId", deleteCourse); // Eliminar un curso por ID
router.patch("/:courseId/toggle-lock", toggleLockCourse); // Ruta para bloquear/desbloquear curso
router.put("/:courseId", updateCourse); // Ruta para actualizar curso
router.post('/upload', upload.single('file'), uploadResource); // Endpoint para subir archivos de recursos

module.exports = router;