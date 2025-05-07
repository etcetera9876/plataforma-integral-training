// backend/socket.js
let ioInstance = null;
function setSocketInstance(io) {
  ioInstance = io;
}
function emitDbChange() {
  if (!ioInstance) {
    console.log('[emitDbChange] No ioInstance disponible, no se emite evento.');
    return;
  }
  console.log('[emitDbChange] Emite evento "dbChange" sin payload');
  ioInstance.emit("dbChange");
}
module.exports = {
  setSocketInstance,
  emitDbChange,
  get ioInstance() { return ioInstance; }
};