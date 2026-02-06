const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

console.log('🚀 Amjilttai holbogdoj aslaa...'); // Immediate log

const app = express();
// Attach driverLocations to app so routes can access it
const driverLocations = {};
app.driverLocations = driverLocations;

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

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/khanmotors';
global.OFFLINE_MODE = false;

const connectDB = async () => {
  try {
    console.log(`Connecting to MongoDB at ${MONGO_URI}...`);
    await mongoose.connect(MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000 
    });
    console.log('✅ MongoDB Connected');
    global.OFFLINE_MODE = false;

    // Seed Data on Startup
    const seedData = require('./utils/seedData');
    await seedData();
    
  } catch (err) {
    console.error('❌ MongoDB Connection Error:', err.message);
    // User requested to disable mock mode and use real data only.
    // console.log('⚠️ SWITCHING TO OFFLINE MOCK MODE. Data will be stored in memory only.');
    // global.OFFLINE_MODE = true;
    console.error('❌ Failed to connect to Database. Exiting process to avoid Mock Data confusion.');
    process.exit(1);
  }
};

connectDB();

const apiRoutes = require('./routes/api');

app.use('/api', apiRoutes);

// In-memory driver locations store (Attached to app above)
// const driverLocations = {}; <--- Removed to avoid duplicate
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

  // Handle Customer Join
  if (socket.handshake.query.customerId) {
    const customerId = socket.handshake.query.customerId;
    socket.join(`customer_${customerId}`);
    console.log(`Customer ${customerId} joined room`);
    // Send all current driver locations to the new customer
    socket.emit('allDriverLocations', driverLocations);
  }
  
  socket.on('customerJoin', (customerId) => {
      socket.join(`customer_${customerId}`);
      console.log(`Customer ${customerId} joined room (manual event)`);
      // Send all current driver locations to the new customer
      socket.emit('allDriverLocations', driverLocations);
  });

  socket.on('adminJoin', () => {
    socket.join('admin_room');
    console.log('Admin joined room');
    // Send all current driver locations to the new admin
    socket.emit('allDriverLocations', driverLocations);
  });

  // Listen for driver location updates
  // Flow: Driver App (GPS) -> Server -> Broadcast to All (Admin + Customers)
  socket.on('driverLocationUpdated', (data) => {
    // data structure: { driverId, location: { lat, lng, heading, plateNumber, ... } }
    
    // 1. Update In-Memory Store
    // We store the latest location for every online driver
    driverLocations[data.driverId] = data.location;
    
    // 2. Mark as Online
    // If we receive updates, the driver is definitely online
    driverStatus[data.driverId] = true;
    
    // 3. Broadcast to Real-time Map Clients
    // Emits to everyone. Clients (Customer App) filter by relevance if needed.
    io.emit('driverLocationUpdated', data);
    
    // Optional: Log for debugging (disable in high traffic production)
    // console.log(`Driver ${data.driverId} moved to [${data.location.lat}, ${data.location.lng}]`);
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
    // Notify customer
    if (data.trip && data.trip.customer) {
        const customerId = typeof data.trip.customer === 'object' ? data.trip.customer._id : data.trip.customer;
        io.to(`customer_${customerId}`).emit('driverAccepted', data);
    }
  });

  socket.on('tripStarted', (data) => {
    io.to('admin_room').emit('tripStarted', data);
    // Notify customer
    if (data.tripId) {
       // We might need trip object to get customerId, but usually tripStarted comes with tripId.
       // Best to fetch or assume client sends customerId. 
       // If data only has tripId, we can't easily emit to customer room without fetching trip.
       // Let's assume data might contain customerId or we emit to global (inefficient) or fetch.
       // BETTER: Client (Driver App) should send customerId or trip object.
       // Let's check Driver App's emit.
       // For now, emit to all (client filters) OR check if data has customerId.
       if (data.customerId) {
         io.to(`customer_${data.customerId}`).emit('tripStarted', data);
       } else {
         // Fallback: emit global tripUpdated, client filters.
         // Or fetch trip (expensive).
         // Driver App should send customerId.
       }
    }
  });

  socket.on('tripCompleted', (data) => {
    io.to('admin_room').emit('tripCompleted', data);
    if (data.customerId) {
        io.to(`customer_${data.customerId}`).emit('tripCompleted', data);
    }
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
