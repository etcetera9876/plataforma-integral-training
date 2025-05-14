// routes/courseRoutes.js
const express = require("express");
const router = express.Router();
const multer = require('multer');
const path = require('path');
const courseController = require('../controllers/courseController');
const {
  createCourse,
  getCoursesByBranch,
  getCoursesForRecruiter,
  getAllCourses, // <-- Nuevo controlador global
  deleteCourse,
  toggleLockCourse, // <-- Agregamos el controlador
  updateCourse, // <-- Agregamos el controlador para actualizar curso
  uploadResource, // <-- Agregamos el controlador para subir recursos
  getCourseById, // <-- Agregamos el controlador para obtener curso por ID
  linkPreview, // <-- Agregamos el controlador para vista previa de enlaces
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
router.get("/all", getAllCourses); // Nueva ruta para obtener todos los cursos (modo global)
router.get("/", getCoursesForRecruiter); // Obtener cursos para reclutador (publicados)SI
router.post("/", createCourse); // Crear un curso
// Endpoint para obtener todos los IDs de cursos firmados por un usuario (debe ir antes de :branchId)
router.get('/signed', require('../middlewares/authMiddleware'), courseController.getSignedCourses);
router.get("/:branchId", getCoursesByBranch); // Obtener cursos por sucursal
router.get("/byid/:id", getCourseById); // Obtener curso por ID (sin conflicto con branchId)
router.delete("/:courseId", deleteCourse); // Eliminar un curso por ID
router.patch("/:courseId/toggle-lock", toggleLockCourse); // Ruta para bloquear/desbloquear curso
router.put("/:courseId", updateCourse); // Ruta para actualizar curso
router.post('/upload', upload.single('file'), uploadResource); // Endpoint para subir archivos de recursos
router.post('/link-preview', linkPreview); // Endpoint para obtener metadatos de un enlace
// Firma de curso
router.get('/:id/signature', require('../middlewares/authMiddleware'), courseController.getCourseSignature);
router.post('/:id/signature', require('../middlewares/authMiddleware'), courseController.signCourse);


module.exports = router;