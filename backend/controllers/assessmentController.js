const mongoose = require('mongoose');
const Assessment = require('../models/assessment');

exports.getAssessments = async (req, res) => {
  try {
    const { branchId } = req.query;
    let filter = {};
    if (branchId && branchId !== 'Global') {
      if (!mongoose.Types.ObjectId.isValid(branchId)) {
        return res.status(400).json({ message: 'branchId inválido' });
      }
      filter.branch = branchId;
    } else if (branchId === 'Global') {
      filter.branch = 'Global';
    }
    const assessments = await Assessment.find(filter).sort({ createdAt: -1 });
    res.json(assessments);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener evaluaciones', error: error.message });
  }
};

exports.createAssessment = async (req, res) => {
  try {
    const { name, description, branch, components } = req.body;

    if (!name) {
      return res.status(400).json({ message: 'El campo "name" es obligatorio.' });
    }
    if (!branch || !mongoose.Types.ObjectId.isValid(branch)) {
      return res.status(400).json({ message: 'El campo "branch" es inválido o no está definido.' });
    }
    if (!components || !Array.isArray(components) || components.length === 0) {
      return res.status(400).json({ message: 'El campo "components" debe ser un array con al menos un elemento.' });
    }

    const assessment = new Assessment({ name, description, branch, components });
    await assessment.save();
    res.status(201).json({ message: 'Evaluación creada con éxito', assessment });
  } catch (error) {
    res.status(500).json({ message: 'Error al crear la evaluación', error: error.message });
  }
};


exports.getAssessmentById = async (req, res) => {
  try {
    const { id } = req.params;
    const assessment = await Assessment.findById(id);
    if (!assessment) {
      return res.status(404).json({ message: 'Evaluación no encontrada' });
    }
    res.json(assessment);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener la evaluación', error: error.message });
  }
};

exports.updateAssessment = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, branch, components } = req.body;
    const updated = await Assessment.findByIdAndUpdate(
      id,
      { name, description, branch, components },
      { new: true }
    );
    if (!updated) {
      return res.status(404).json({ message: 'Evaluación no encontrada' });
    }
    res.json({ message: 'Evaluación actualizada', assessment: updated });
  } catch (error) {
    res.status(500).json({ message: 'Error al actualizar la evaluación', error: error.message });
  }
};

exports.deleteAssessment = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Assessment.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ message: 'Evaluación no encontrada' });
    }
    res.json({ message: 'Evaluación eliminada' });
  } catch (error) {
    res.status(500).json({ message: 'Error al eliminar la evaluación', error: error.message });
  }
};

exports.toggleLockAssessment = async (req, res) => {
  try {
    const { id } = req.params;
    const assessment = await Assessment.findById(id);
    if (!assessment) {
      return res.status(404).json({ message: 'Evaluación no encontrada' });
    }
    assessment.isLocked = !assessment.isLocked;
    await assessment.save();
    res.json({ message: 'Estado de bloqueo actualizado', assessment });
  } catch (error) {
    res.status(500).json({ message: 'Error al actualizar el estado de bloqueo', error: error.message });
  }
};