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
module.exports = { setSocketInstance, emitDbChange };