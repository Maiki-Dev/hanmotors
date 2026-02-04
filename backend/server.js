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
const socketToDriver = {}; // Map socket.id -> driverId
const driverStatus = {}; // Map driverId -> isOnline

io.on('connection', (socket) => {
  console.log('🔌 New client connected:', socket.id);
  
  socket.on('driverJoin', (driverId) => {
    socket.join(`driver_${driverId}`);
    socket.join('drivers_room');
    socketToDriver[socket.id] = driverId; // Track socket
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
    // Update store (Client side handles isOnline check)
    driverLocations[data.driverId] = data.location;
    // Mark as online implicitly since they are sending updates
    driverStatus[data.driverId] = true;
    
    // Broadcast to admin and other drivers
    // Also emit globally so customers can track their driver
    io.emit('driverLocationUpdated', data);
  });

  socket.on('driverStatusUpdate', (data) => {
    // data = { driverId, isOnline }
    driverStatus[data.driverId] = data.isOnline; // Track status
    
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
    const driverId = socketToDriver[socket.id];
    if (driverId) {
      console.log(`Driver ${driverId} disconnected (Socket closed)`);
      // Remove from location store
      delete driverLocations[driverId];
      delete socketToDriver[socket.id];
      delete driverStatus[driverId]; // Clean up status
      
      // Broadcast location removal
      io.to('admin_room').to('drivers_room').emit('driverLocationUpdated', {
        driverId: driverId,
        location: null
      });
      
      // Update isOnline status in DB to false (Optional, but good for consistency)
      // Using require inside to avoid circular deps if any
      const Driver = require('./models/Driver');
      Driver.findByIdAndUpdate(driverId, { isOnline: false }).catch(err => console.error(err));
      io.emit('driverStatusUpdated', { driverId, isOnline: false });
    }
  });
});

app.set('io', io);

const BASE_PORT = Number(process.env.PORT) || 5000;

const startServer = (port) => {
  server.listen(port, () => {
    console.log(`🚀 Server running on port ${port}`);
  });
};

// Handle port-in-use gracefully by retrying on the next port
server.once('error', (err) => {
  if (err && err.code === 'EADDRINUSE') {
    const fallbackPort = BASE_PORT + 1;
    console.warn(`⚠️ Port ${BASE_PORT} is in use. Retrying on ${fallbackPort}...`);
    startServer(fallbackPort);
  } else {
    throw err;
  }
});

startServer(BASE_PORT);
