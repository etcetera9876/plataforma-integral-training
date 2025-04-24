const mongoose = require('mongoose');
const Block = require('../models/block');
const Assessment = require('../models/assessment');

exports.createBlock = async (req, res) => {
  try {
    const { label, weight, branch } = req.body;
    if (!label || !weight || !branch) {
      return res.status(400).json({ message: 'Faltan campos obligatorios: label, weight o branch.' });
    }
    if (!mongoose.Types.ObjectId.isValid(branch)) {
      return res.status(400).json({ message: 'El campo branch debe ser un ObjectId válido.' });
    }
    const type = label.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
    const block = new Block({ label, type, weight, branch });
    await block.save();
    res.status(201).json(block);
  } catch (error) {
    res.status(500).json({ message: 'Error al crear el bloque', error: error.message });
  }
};

exports.getBlocksByBranch = async (req, res) => {
  try {
    const { branchId } = req.params;
    const blocks = await Block.find({ branch: branchId }).sort({ label: 1 });
    res.json(blocks);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener bloques', error: error.message });
  }
};

exports.updateBlock = async (req, res) => {
  try {
    console.log('updateBlock req.params:', req.params); // LOG
    console.log('updateBlock req.body:', req.body); // LOG
    const { id } = req.params;
    const { label, weight } = req.body;
    // Validaciones extra
    if (!label || label.trim() === "") {
      console.log('Label vacío o inválido:', label); // LOG
      return res.status(400).json({ message: 'El nombre del bloque no puede estar vacío.' });
    }
    if (weight === undefined || weight === null || isNaN(Number(weight)) || Number(weight) <= 0) {
      console.log('Peso inválido:', weight); // LOG
      return res.status(400).json({ message: 'El peso debe ser un número mayor a 0.' });
    }
    if (!mongoose.Types.ObjectId.isValid(id)) {
      console.log('ID de bloque inválido:', id); // LOG
      return res.status(400).json({ message: 'ID de bloque inválido.' });
    }
    const type = label.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
    const updated = await Block.findByIdAndUpdate(id, { label, type, weight }, { new: true });
    if (!updated) {
      console.log('Bloque no encontrado:', id); // LOG
      return res.status(404).json({ message: 'Bloque no encontrado' });
    }
    res.json({
      message: `Bloque actualizado.`,
      updated
    });
  } catch (error) {
    console.error('Error en updateBlock:', error); // LOG
    res.status(500).json({ message: 'Error al actualizar el bloque', error: error.message });
  }
};

exports.deleteBlock = async (req, res) => {
  try {
    const { id } = req.params;
    const block = await Block.findById(id);
    if (!block) return res.status(404).json({ message: 'Bloque no encontrado' });
    // Buscar evaluaciones que usen este bloque en components (array de objetos { block, weight })
    const usedAssessments = await Assessment.find({ 'components.block': block._id }).select('name');
    if (usedAssessments.length > 0) {
      const testNames = usedAssessments.map(a => a.name).join(', ');
      return res.status(400).json({ message: `No se puede eliminar el bloque porque está siendo usado en el/los test(s): ${testNames}` });
    }
    await Block.findByIdAndDelete(id);
    res.json({ message: 'Bloque eliminado correctamente' });
  } catch (error) {
    res.status(500).json({ message: 'Error al eliminar el bloque', error: error.message });
  }
};
