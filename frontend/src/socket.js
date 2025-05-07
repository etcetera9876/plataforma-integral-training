import io from "socket.io-client";

const socketUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';
const socket = io(socketUrl, {
  transports: ["websocket"],
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
});

export default socket;
