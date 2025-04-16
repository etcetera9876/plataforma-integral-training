// backend/socket.js
let ioInstance = null;
function setSocketInstance(io) {
  ioInstance = io;
}
async function emitDbChange() {
  if (!ioInstance) return;
  const Course = require('./models/course');
  const currentDate = new Date();
  const coursesToPublish = await Course.find({
    publicationDate: { $lte: currentDate },
    $or: [{ expirationDate: null }, { expirationDate: { $gte: currentDate } }],
  }).sort({ createdAt: -1 });
  ioInstance.emit("dbChange", coursesToPublish);
}
module.exports = { setSocketInstance, emitDbChange };