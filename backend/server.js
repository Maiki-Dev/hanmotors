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
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

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

// In-memory driver locations store
const driverLocations = {};

io.on('connection', (socket) => {
  console.log('🔌 New client connected:', socket.id);
  
  socket.on('driverJoin', (driverId) => {
    socket.join(`driver_${driverId}`);
    socket.join('drivers_room');
    console.log(`Driver ${driverId} joined room`);
    // Send all current driver locations to the joining driver
    socket.emit('allDriverLocations', driverLocations);
  });

  socket.on('adminJoin', () => {
    socket.join('admin_room');
    console.log('Admin joined room');
    // Send all current driver locations to the new admin
    socket.emit('allDriverLocations', driverLocations);
  });

  socket.on('driverLocationUpdated', (data) => {
    // Update store
    driverLocations[data.driverId] = data.location;
    // Broadcast to admin and other drivers
    io.to('admin_room').to('drivers_room').emit('driverLocationUpdated', data);
  });

  socket.on('driverStatusUpdate', (data) => {
    // data = { driverId, isOnline }
    if (!data.isOnline) {
      // Remove from location store if offline
      delete driverLocations[data.driverId];
      // Broadcast location removal (send null)
      io.to('admin_room').to('drivers_room').emit('driverLocationUpdated', {
        driverId: data.driverId,
        location: null
      });
    }
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
