// backend/socket.js
let ioInstance = null;
function setSocketInstance(io) {
  ioInstance = io;
}
async function emitDbChange() {
  if (!ioInstance) return;
  // Solo emite la señal, sin enviar cursos
  ioInstance.emit("dbChange");
}
// Exportar también ioInstance para acceso directo
module.exports = { setSocketInstance, emitDbChange, ioInstance };