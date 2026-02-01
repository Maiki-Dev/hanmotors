const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

console.log('🚀 Starting Backend Server...'); // Immediate log

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/xanmotors';
global.OFFLINE_MODE = false;

const connectDB = async () => {
  try {
    await mongoose.connect(MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000 // Timeout after 5s instead of 30s
    });
    console.log('✅ MongoDB Connected');
    global.OFFLINE_MODE = false;
  } catch (err) {
    console.error('❌ MongoDB Connection Error:', err.message);
    console.log('⚠️ SWITCHING TO OFFLINE MOCK MODE. Data will be stored in memory only.');
    global.OFFLINE_MODE = true;
  }
};

connectDB();

const apiRoutes = require('./routes/api');
app.use('/api', apiRoutes);

io.on('connection', (socket) => {
  console.log('🔌 New client connected:', socket.id);
  
  socket.on('driverJoin', (driverId) => {
    socket.join(`driver_${driverId}`);
    console.log(`Driver ${driverId} joined room`);
  });

  socket.on('adminJoin', () => {
    socket.join('admin_room');
    console.log('Admin joined room');
  });

  socket.on('driverLocationUpdated', (data) => {
    io.to('admin_room').emit('driverLocationUpdated', data);
  });

  socket.on('requestAssigned', (data) => {
    io.to(`driver_${data.driverId}`).emit('requestAssigned', data.tripData);
  });

  socket.on('driverAccepted', (data) => {
    io.to('admin_room').emit('driverAccepted', data);
  });

  socket.on('tripStarted', (data) => {
    io.to('admin_room').emit('tripStarted', data);
  });

  socket.on('tripCompleted', (data) => {
    io.to('admin_room').emit('tripCompleted', data);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

app.set('io', io);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
