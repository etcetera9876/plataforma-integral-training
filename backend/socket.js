// backend/socket.js
let ioInstance = null;
function setSocketInstance(io) {
  ioInstance = io;
}
function emitDbChange() {
  if (!ioInstance) {
    return;
  }
  ioInstance.emit("dbChange");
}
module.exports = {
  setSocketInstance,
  emitDbChange,
  get ioInstance() { return ioInstance; }
};