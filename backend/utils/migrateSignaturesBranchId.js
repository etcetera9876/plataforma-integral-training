// Script de migración: asigna branchId a firmas antiguas
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const db = require('../config/db');
const CourseSignature = require('../models/courseSignature');
const Course = require('../models/course');

async function migrate() {
  await db();
  const firmas = await CourseSignature.find({ $or: [ { branchId: { $exists: false } }, { branchId: null } ] });
  let count = 0;
  for (const firma of firmas) {
    if (!firma.courseId) continue;
    const curso = await Course.findById(firma.courseId);
    if (curso && curso.branchId) {
      firma.branchId = curso.branchId;
      await firma.save();
      count++;
    }
  }
  console.log(`Firmas migradas: ${count}`);
  mongoose.connection.close();
}

migrate().catch(err => {
  console.error('Error en la migración:', err);
  mongoose.connection.close();
});
