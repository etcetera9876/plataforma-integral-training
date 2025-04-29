const mongoose = require('mongoose');
const Block = require('../models/block');
const Assessment = require('../models/assessment');

exports.createBlock = async (req, res) => {
  try {
    const { label, weight, branch } = req.body;
    if (!label || !weight || !branch) {
      return res.status(400).json({ message: 'Faltan campos obligatorios: label, weight o branch.' });
    }
    // Permitir branch tipo string ("Global") o ObjectId válido
    const isValidBranch = branch === "Global" || mongoose.Types.ObjectId.isValid(branch);
    if (!isValidBranch) {
      return res.status(400).json({ message: 'El campo branch debe ser un ObjectId válido o "Global".' });
    }

    // Normalizar el label para comparar (sin acentos, minúsculas, sin espacios)
    const normalize = str => str.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().replace(/\s+/g, '');
    const normalizedLabel = normalize(label);
    // Buscar bloques existentes en la rama (soporta branch string u ObjectId)
    const blocks = await Block.find({ branch });
    const exists = blocks.some(b => normalize(b.label) === normalizedLabel);
    if (exists) {
      return res.status(400).json({ message: 'Ya existe un bloque con un nombre igual o similar en esta rama.' });
    }

    const type = label.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
    const block = new Block({ label, type, weight, branch });
    await block.save();

    res.status(201).json({ message: 'Bloque creado con éxito', block });
  } catch (error) {
    res.status(500).json({ message: 'Error al crear el bloque', error: error.message });
  }
};

exports.getBlocksByBranch = async (req, res) => {
  try {
    const { branchId } = req.params;
    // Permitir branchId como string o ObjectId válido
    if (!branchId || (branchId !== 'Global' && !mongoose.Types.ObjectId.isValid(branchId))) {
      return res.status(400).json({ message: 'branchId inválido' });
    }
    // Buscar bloques por branch (soporta string o ObjectId)
    const blocks = await Block.find({ branch: branchId }).sort({ label: 1 });
    res.json(blocks);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener bloques', error: error.message });
  }
};

exports.updateBlock = async (req, res) => {
  // LOGS para depuración
  console.log('updateBlock - req.params:', req.params);
  console.log('updateBlock - req.body:', req.body);
  try {
    const { id } = req.params;
    const { label, weight } = req.body;
    const type = label.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
    const updated = await Block.findByIdAndUpdate(id, { label, type, weight }, { new: true });
    if (!updated) return res.status(404).json({ message: 'Bloque no encontrado' });
    // Sincronizar el peso en todas las evaluaciones que usen este bloque
    const result = await Assessment.updateMany(
      { 'components.block': id },
      { $set: { 'components.$[elem].weight': weight } },
      { arrayFilters: [{ 'elem.block': id }] }
    );
    res.json({
      message: `Bloque actualizado. Peso sincronizado en ${result.modifiedCount} evaluaciones.`,
      updated,
      modifiedCount: result.modifiedCount
    });
  } catch (error) {
    res.status(500).json({ message: 'Error al actualizar el bloque', error: error.message });
  }
};

exports.deleteBlock = async (req, res) => {
  try {
    const { id } = req.params;
    const block = await Block.findById(id);
    if (!block) return res.status(404).json({ message: 'Bloque no encontrado' });
    // Buscar evaluaciones que usan este bloque
    const usedAssessments = await Assessment.find({ 'components.block': id }, 'name');
    if (usedAssessments.length > 0) {
      // Devuelve los nombres de los tests que usan el bloque
      return res.status(400).json({ 
        message: 'No se puede eliminar: el bloque está siendo usado en evaluaciones.',
        usedIn: usedAssessments.map(a => a.name)
      });
    }
    await Block.findByIdAndDelete(id);
    res.json({ message: 'Bloque eliminado correctamente' });
  } catch (error) {
    res.status(500).json({ message: 'Error al eliminar el bloque', error: error.message });
  }
};
