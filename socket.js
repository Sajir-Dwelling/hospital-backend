const jwt = require('jsonwebtoken');
const { Server } = require('socket.io');

let io = null;

// Call once from server.js with the http server
const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: { origin: true, credentials: true },
  });

  // Only logged-in users may connect (same JWT as the REST API)
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error('No token'));
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const id = decoded.id || decoded._id || decoded.userId;
      if (!id) return next(new Error('Bad token'));
      socket.userId = String(id);
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    // Each user gets a private room
    socket.join(`user:${socket.userId}`);
  });

  return io;
};

// Send an event to one user. Safe to call even if nobody is connected.
const emitToUser = (userId, event, payload = {}) => {
  try {
    if (io && userId) io.to(`user:${String(userId)}`).emit(event, payload);
  } catch (err) {
    console.error('Socket emit error:', err.message);
  }
};

module.exports = { initSocket, emitToUser };
