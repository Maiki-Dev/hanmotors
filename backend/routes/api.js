const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Driver = require('../models/Driver');
const Trip = require('../models/Trip');
const Pricing = require('../models/Pricing');

// --- MOCK DATA STORE (For Offline Mode) ---
let mockDrivers = [
  {
    _id: 'mock_driver_1',
    firstName: 'Бат-Эрдэнэ',
    lastName: 'Дорж',
    name: 'Дорж Бат-Эрдэнэ',
    email: 'bat@example.com',
    phone: '99112233',
    password: 'password',
    status: 'active',
    vehicleType: 'Tow',
    isOnline: true,
    rating: 4.8,
    vehicle: { plateNumber: 'УБА 1234', model: 'Hyundai Porter' },
    earnings: { total: 150000, daily: 50000, weekly: 150000 },
    wallet: { balance: 25000 },
    documents: { isVerified: true },
    createdAt: new Date()
  },
  {
    _id: 'mock_driver_2',
    firstName: 'Ганзориг',
    lastName: 'Болд',
    name: 'Болд Ганзориг',
    email: 'ganzo@example.com',
    phone: '88114455',
    password: 'password',
    status: 'pending',
    vehicleType: 'Tow',
    isOnline: false,
    rating: 0,
    vehicle: { plateNumber: 'УББ 5678', model: 'Kia Bongo' },
    earnings: { total: 0, daily: 0, weekly: 0 },
    wallet: { balance: 0 },
    documents: { isVerified: false },
    createdAt: new Date()
  }
];

// Helper to check offline mode (controlled by server.js)
const isOffline = () => global.OFFLINE_MODE === true;

// Register new driver
router.post('/driver/register', async (req, res) => {
  if (isOffline()) {
    const { firstName, lastName, email, phone, password, vehicleType } = req.body;
    const name = lastName && firstName ? `${lastName} ${firstName}` : req.body.name;
    
    const newDriver = {
      _id: 'mock_driver_' + Date.now(),
      firstName: firstName || name.split(' ')[1] || '',
      lastName: lastName || name.split(' ')[0] || '',
      name, 
      email, phone, password, vehicleType,
      status: 'pending',
      isOnline: false,
      rating: 5.0,
      earnings: { total: 0 },
      wallet: { balance: 0 },
      createdAt: new Date()
    };
    mockDrivers.push(newDriver);
    console.log(`[${new Date().toISOString()}] 🆕 New Driver Registered (Offline): ${name} (${email})`);
    return res.status(201).json(newDriver);
  }

  try {
    const { firstName, lastName, email, phone, password, vehicleType } = req.body;
    const name = lastName && firstName ? `${lastName} ${firstName}` : req.body.name;

    // Check if driver exists
    const existingDriver = await Driver.findOne({ $or: [{ email }, { phone }] });
    if (existingDriver) {
      return res.status(400).json({ message: 'Driver with this email or phone already exists' });
    }

    const driver = new Driver({
      firstName,
      lastName,
      name,
      email,
      phone,
      password, // In production, hash this!
      vehicleType,
      vehicle: req.body.vehicle, // Add vehicle details
      documents: req.body.documents || {},
      status: 'active' // Default to active for immediate login
    });

    await driver.save();
    console.log(`[${new Date().toISOString()}] 🆕 New Driver Registered: ${name} (${email})`);
    
    // Notify admin via socket if possible
    const io = req.app.get('io');
    if (io) {
      io.emit('newDriverRegistered', driver);
    }
    
    res.status(201).json(driver);
  } catch (err) {
    console.error(`[${new Date().toISOString()}] ❌ Registration Error: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

// Request OTP
router.post('/driver/auth/otp/request', async (req, res) => {
  const { phone } = req.body;
  
  if (isOffline()) {
    const driver = mockDrivers.find(d => d.phone === phone);
    if (!driver) return res.status(404).json({ message: 'Driver not found (Mock)' });
    
    const otp = '1234';
    driver.otp = otp;
    driver.otpExpiry = new Date(Date.now() + 5 * 60000);
    return res.json({ message: 'OTP sent successfully (Mock)', dev_otp: otp });
  }

  try {
    const driver = await Driver.findOne({ phone });
    if (!driver) return res.json({ exists: false, message: 'Driver not found' });

    // Generate 4 digit OTP
    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    const otpExpiry = new Date(Date.now() + 5 * 60000); // 5 mins

    driver.otp = otp;
    driver.otpExpiry = otpExpiry;
    await driver.save();

    // In production, send SMS here
    console.log(`OTP for ${phone}: ${otp}`);

    res.json({ message: 'OTP sent successfully', dev_otp: otp });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Verify OTP
router.post('/driver/auth/otp/verify', async (req, res) => {
  const { phone, otp } = req.body;
  
  if (isOffline()) {
    const driver = mockDrivers.find(d => d.phone === phone);
    if (!driver) return res.status(404).json({ message: 'Driver not found (Mock)' });
    if (otp !== '1234' && driver.otp !== otp) return res.status(400).json({ message: 'Invalid OTP (Mock: use 1234)' });
    
    return res.json(driver);
  }

  try {
    const driver = await Driver.findOne({ phone });
    if (!driver) return res.status(404).json({ message: 'Driver not found' });

    if (driver.otp !== otp || driver.otpExpiry < Date.now()) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    if (driver.status === 'pending') {
      return res.status(403).json({ message: 'Таны бүртгэл хүлээгдэж байна. Админ баталгаажуулсны дараа нэвтрэх боломжтой.' });
    }
    
    if (driver.status === 'blocked' || driver.status === 'inactive') {
      return res.status(403).json({ message: 'Таны эрх хаагдсан байна.' });
    }

    // Clear OTP
    driver.otp = undefined;
    driver.otpExpiry = undefined;
    await driver.save();

    res.json(driver);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/driver/login', async (req, res) => {
  const { phone, password } = req.body;
  
  if (isOffline()) {
    const driver = mockDrivers.find(d => d.phone === phone && d.password === password);
    if (!driver) return res.status(400).json({ message: 'Invalid credentials (Mock)' });
    return res.json(driver);
  }

  try {
    const driver = await Driver.findOne({ phone, password });
    if (!driver) return res.status(400).json({ message: 'Утасны дугаар эсвэл нууц үг буруу байна' });
    
    if (driver.status === 'pending') {
      return res.status(403).json({ message: 'Таны бүртгэл хүлээгдэж байна. Админ баталгаажуулсны дараа нэвтрэх боломжтой.' });
    }
    
    if (driver.status === 'blocked' || driver.status === 'inactive') {
      return res.status(403).json({ message: 'Таны эрх хаагдсан байна.' });
    }

    res.json(driver);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/driver/:id/status', async (req, res) => {
  if (isOffline()) {
    const driver = mockDrivers.find(d => d._id === req.params.id);
    if (driver) {
      driver.isOnline = req.body.isOnline;
      const io = req.app.get('io');
      if (io) io.emit('driverStatusUpdated', { driverId: req.params.id, isOnline: req.body.isOnline });
      return res.json(driver);
    }
    return res.status(404).json({ message: 'Driver not found' });
  }

  try {
    const { isOnline } = req.body;
    const driver = await Driver.findByIdAndUpdate(req.params.id, { isOnline }, { new: true });
    
    const io = req.app.get('io');
    io.emit('driverStatusUpdated', { driverId: req.params.id, isOnline });
    
    // Sync pending trips if going online
    if (isOnline) {
      const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
      const pendingTrips = await Trip.find({ 
        status: 'pending', 
        createdAt: { $gt: twoMinutesAgo } 
      });
      
      pendingTrips.forEach(trip => {
         io.to(`driver_${req.params.id}`).emit('newJobRequest', trip);
      });
    }

    res.json(driver);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/driver/:id', async (req, res) => {
  if (isOffline()) {
    const driver = mockDrivers.find(d => d._id === req.params.id);
    return driver ? res.json(driver) : res.status(404).json({ message: 'Not found' });
  }

  try {
    const driver = await Driver.findById(req.params.id);
    if (!driver) return res.status(404).json({ message: 'Driver not found' });
    res.json(driver);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get Driver Stats (Real-time calculation)
router.get('/driver/:id/stats', async (req, res) => {
  if (isOffline()) {
    const driver = mockDrivers.find(d => d._id === req.params.id);
    if (!driver) return res.status(404).json({ message: 'Driver not found' });
    return res.json({
      today: { trips: 5, earnings: 125000 },
      month: { trips: 45, earnings: 1500000 },
      total: { trips: 120, earnings: 3500000 }
    });
  }

  try {
    const driverId = req.params.id;
    const now = new Date();
    
    // Start of Today
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    // Start of Month
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Aggregate Stats
    const stats = await Trip.aggregate([
      { 
        $match: { 
          driver: new mongoose.Types.ObjectId(driverId), 
          status: 'completed' 
        } 
      },
      {
        $group: {
          _id: null,
          totalTrips: { $sum: 1 },
          totalEarnings: { $sum: '$price' },
          todayTrips: {
            $sum: {
              $cond: [{ $gte: ['$createdAt', startOfDay] }, 1, 0]
            }
          },
          todayEarnings: {
            $sum: {
              $cond: [{ $gte: ['$createdAt', startOfDay] }, '$price', 0]
            }
          },
          monthTrips: {
            $sum: {
              $cond: [{ $gte: ['$createdAt', startOfMonth] }, 1, 0]
            }
          },
          monthEarnings: {
            $sum: {
              $cond: [{ $gte: ['$createdAt', startOfMonth] }, '$price', 0]
            }
          }
        }
      }
    ]);

    if (stats.length > 0) {
      res.json({
        today: { trips: stats[0].todayTrips, earnings: stats[0].todayEarnings },
        month: { trips: stats[0].monthTrips, earnings: stats[0].monthEarnings },
        total: { trips: stats[0].totalTrips, earnings: stats[0].totalEarnings }
      });
    } else {
      res.json({
        today: { trips: 0, earnings: 0 },
        month: { trips: 0, earnings: 0 },
        total: { trips: 0, earnings: 0 }
      });
    }
  } catch (err) {
    console.error('Stats Error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.put('/driver/:id/profile', async (req, res) => {
  if (isOffline()) {
    const driver = mockDrivers.find(d => d._id === req.params.id);
    if (driver) {
      const { firstName, lastName } = req.body;
      Object.assign(driver, req.body);
      
      // Update full name if first/last name changed
      if (firstName || lastName) {
        driver.firstName = firstName || driver.firstName;
        driver.lastName = lastName || driver.lastName;
        driver.name = `${driver.lastName} ${driver.firstName}`;
      }
      
      return res.json(driver);
    }
    return res.status(404).json({ message: 'Not found' });
  }

  try {
    const { name, email, phone, profilePhoto, firstName, lastName } = req.body;
    let updateData = { email, phone, profilePhoto, firstName, lastName };
    
    if (firstName || lastName) {
       const currentDriver = await Driver.findById(req.params.id);
       if (currentDriver) {
         const newFirst = firstName || currentDriver.firstName;
         const newLast = lastName || currentDriver.lastName;
         updateData.name = `${newLast} ${newFirst}`;
       }
    } else if (name) {
       updateData.name = name;
    }

    const driver = await Driver.findByIdAndUpdate(
      req.params.id, 
      updateData, 
      { new: true }
    );
    res.json(driver);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/driver/:id/vehicle', async (req, res) => {
  if (isOffline()) {
    const driver = mockDrivers.find(d => d._id === req.params.id);
    if (driver) {
      Object.assign(driver, req.body);
      return res.json(driver);
    }
    return res.status(404).json({ message: 'Not found' });
  }

  try {
    const { vehicle, vehicleType } = req.body;
    const driver = await Driver.findByIdAndUpdate(
      req.params.id, 
      { vehicle, vehicleType }, 
      { new: true }
    );
    res.json(driver);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/driver/:id/documents', async (req, res) => {
  if (isOffline()) {
    const driver = mockDrivers.find(d => d._id === req.params.id);
    if (driver) {
      Object.assign(driver, req.body);
      return res.json(driver);
    }
    return res.status(404).json({ message: 'Not found' });
  }

  try {
    const { documents } = req.body;
    const driver = await Driver.findByIdAndUpdate(
      req.params.id, 
      { documents }, 
      { new: true }
    );
    res.json(driver);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/driver/:id/settings', async (req, res) => {
  if (isOffline()) {
    const driver = mockDrivers.find(d => d._id === req.params.id);
    if (driver) {
      Object.assign(driver, req.body);
      return res.json(driver);
    }
    return res.status(404).json({ message: 'Not found' });
  }

  try {
    const { settings } = req.body;
    const driver = await Driver.findByIdAndUpdate(
      req.params.id, 
      { settings }, 
      { new: true }
    );
    res.json(driver);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/driver/:id', async (req, res) => {
  if (isOffline()) {
    const driver = mockDrivers.find(d => d._id === req.params.id);
    return driver ? res.json(driver) : res.status(404).json({ message: 'Not found' });
  }

  try {
    const driver = await Driver.findById(req.params.id);
    if (!driver) return res.status(404).json({ message: 'Driver not found' });
    res.json(driver);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/driver/:id/earnings', async (req, res) => {
  if (isOffline()) {
    const driver = mockDrivers.find(d => d._id === req.params.id);
    return res.json({ earnings: driver?.earnings || {}, history: [] });
  }

  try {
    const driver = await Driver.findById(req.params.id);
    if (!driver) return res.status(404).json({ message: 'Driver not found' });
    const trips = await Trip.find({ driver: req.params.id, status: 'completed' }).sort({ createdAt: -1 });
    res.json({
      earnings: driver.earnings,
      history: trips
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/admin/stats', async (req, res) => {
  if (isOffline()) {
    return res.json({
      activeDrivers: mockDrivers.filter(d => d.status === 'active').length,
      onlineDrivers: mockDrivers.filter(d => d.isOnline).length,
      todayRequests: 5,
      totalRevenue: 250000
    });
  }

  try {
    const { startDate, endDate } = req.query;
    const activeDrivers = await Driver.countDocuments({ status: 'active' });
    const onlineDrivers = await Driver.countDocuments({ isOnline: true });
    
    // Today requests (always today)
    const today = new Date();
    today.setHours(0,0,0,0);
    const todayRequests = await Trip.countDocuments({ createdAt: { $gte: today } });
    
    // Total Revenue (Filtered by date if provided)
    let dateFilter = { status: 'completed' };
    if (startDate && endDate) {
      dateFilter.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(new Date(endDate).setHours(23, 59, 59, 999))
      };
    }
    
    const allTrips = await Trip.find(dateFilter);
    const totalRevenue = allTrips.reduce((acc, trip) => acc + (trip.price || 0), 0);

    res.json({
      activeDrivers,
      onlineDrivers,
      todayRequests,
      totalRevenue
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin Get Drivers (Needs to be at the end or specific route)
router.get('/admin/drivers', async (req, res) => {
  if (isOffline()) {
    return res.json(mockDrivers);
  }

  try {
    const drivers = await Driver.find().sort({ createdAt: -1 });
    res.json(drivers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin Update Driver
router.put('/admin/driver/:id', async (req, res) => {
  if (isOffline()) {
    const driverIndex = mockDrivers.findIndex(d => d._id === req.params.id);
    if (driverIndex > -1) {
      const { firstName, lastName } = req.body;
      mockDrivers[driverIndex] = { ...mockDrivers[driverIndex], ...req.body };
      
      // Update full name if first/last name changed
      if (firstName || lastName) {
        const d = mockDrivers[driverIndex];
        d.firstName = firstName || d.firstName;
        d.lastName = lastName || d.lastName;
        d.name = `${d.lastName} ${d.firstName}`;
      }
      
      return res.json(mockDrivers[driverIndex]);
    }
    return res.status(404).json({ message: 'Not found' });
  }

  try {
    let updateData = { ...req.body };
    const { firstName, lastName, name } = req.body;
    
    if (firstName || lastName) {
       const currentDriver = await Driver.findById(req.params.id);
       if (currentDriver) {
         const newFirst = firstName || currentDriver.firstName;
         const newLast = lastName || currentDriver.lastName;
         updateData.name = `${newLast} ${newFirst}`;
       }
    }

    const driver = await Driver.findByIdAndUpdate(req.params.id, updateData, { new: true });
    res.json(driver);
  } catch (err) {
    console.error(`[${new Date().toISOString()}] ❌ Update Error: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

// Admin Delete Driver
router.delete('/admin/driver/:id', async (req, res) => {
  if (isOffline()) {
    const driverToDelete = mockDrivers.find(d => d._id === req.params.id);
    const initialLength = mockDrivers.length;
    mockDrivers = mockDrivers.filter(d => d._id !== req.params.id);
    if (mockDrivers.length < initialLength) {
      console.log(`[${new Date().toISOString()}] 🗑️ Driver Deleted (Offline): ${driverToDelete.name} (ID: ${req.params.id})`);
      return res.json({ message: 'Driver deleted' });
    }
    return res.status(404).json({ message: 'Not found' });
  }

  try {
    const deletedDriver = await Driver.findByIdAndDelete(req.params.id);
    if (deletedDriver) {
      console.log(`[${new Date().toISOString()}] 🗑️ Driver Deleted: ${deletedDriver.name} (ID: ${req.params.id})`);
      res.json({ message: 'Driver deleted' });
    } else {
      res.status(404).json({ message: 'Driver not found' });
    }
  } catch (err) {
    console.error(`[${new Date().toISOString()}] ❌ Deletion Error: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

router.get('/admin/trips', async (req, res) => {
  try {
    const trips = await Trip.find().populate('driver', 'name phone').sort({ createdAt: -1 });
    res.json(trips);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/trip/request', async (req, res) => {
  try {
    let tripData = { ...req.body };
    
    // Auto-calculate price based on Pricing rules
    if (tripData.distance) {
      const dist = Number(tripData.distance);
      let pricingRule = null;

      if (tripData.vehicleModel) {
        pricingRule = await Pricing.findOne({ vehicleType: tripData.vehicleModel });
      }

      if (pricingRule) {
        let calculatedPrice = pricingRule.basePrice;
        if (dist > 4) {
          calculatedPrice += (dist - 4) * pricingRule.pricePerKm;
        }
        tripData.price = calculatedPrice;
      } else if (tripData.serviceType === 'Tow') {
        // Fallback to default logic if no specific rule found
        let calculatedPrice = 80000; // Base price <= 4km
        if (dist > 4 && dist <= 20) {
          calculatedPrice += (dist - 4) * 10000;
        } else if (dist > 20) {
          calculatedPrice += (16 * 10000) + (dist - 20) * 5000;
        }
        tripData.price = calculatedPrice;
      }
    }

    const trip = new Trip(tripData);
    await trip.save();
    const io = req.app.get('io');
    io.emit('newJobRequest', trip);
    res.json(trip);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/trip/:id', async (req, res) => {
  try {
    const trip = await Trip.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!trip) return res.status(404).json({ message: 'Trip not found' });
    
    const io = req.app.get('io');
    io.emit('tripUpdated', trip); // General update
    if (trip.driver) {
      io.to(`driver_${trip.driver}`).emit('jobUpdated', trip);
    }
    
    res.json(trip);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/trip/:id', async (req, res) => {
  try {
    const trip = await Trip.findByIdAndDelete(req.params.id);
    if (!trip) return res.status(404).json({ message: 'Trip not found' });
    
    const io = req.app.get('io');
    io.emit('tripDeleted', { tripId: req.params.id });
    if (trip.driver) {
      io.to(`driver_${trip.driver}`).emit('jobCancelled', { tripId: req.params.id });
    }

    res.json({ message: 'Trip deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/trip/:id/assign', async (req, res) => {
  try {
    const { driverId } = req.body;
    // We update the driver but keep status as pending until they accept
    // OR we can set a specific status like 'assigned' if we want
    const trip = await Trip.findByIdAndUpdate(req.params.id, { 
      driver: driverId 
    }, { new: true });
    
    if (!trip) return res.status(404).json({ message: 'Trip not found' });

    const io = req.app.get('io');
    // Emit to specific driver
    io.to(`driver_${driverId}`).emit('requestAssigned', trip);
    
    res.json(trip);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Trip Actions
router.post('/trip/:id/accept', async (req, res) => {
  try {
    const { driverId } = req.body;
    
    // Check driver wallet balance
    const driver = await Driver.findById(driverId);
    if (!driver) {
      return res.status(404).json({ message: 'Driver not found' });
    }
    
    if (driver.wallet.balance <= 0) {
      return res.status(403).json({ message: 'Таны хэтэвчний үлдэгдэл хүрэлцэхгүй байна. Цэнэглэнэ үү.' });
    }
    
    // Check if trip is already taken
    const existingTrip = await Trip.findById(req.params.id);
    if (!existingTrip) {
      return res.status(404).json({ message: 'Trip not found' });
    }
    if (existingTrip.status !== 'pending') {
      return res.status(400).json({ message: 'This trip has already been accepted by another driver.' });
    }

    const trip = await Trip.findByIdAndUpdate(req.params.id, { 
      status: 'accepted',
      driver: driverId
    }, { new: true });
    
    const io = req.app.get('io');
    io.emit('tripUpdated', trip); // Emit generic update for Admin Dashboard
    io.emit('driverAccepted', { tripId: trip._id, driverId });
    // Also emit to other drivers to remove the request from their screen if they have it open
    io.emit('jobTaken', { tripId: trip._id, driverId });

    res.json(trip);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/trip/:id/start', async (req, res) => {
  try {
    const trip = await Trip.findByIdAndUpdate(req.params.id, { 
      status: 'in_progress',
      startTime: new Date()
    }, { new: true });
    
    const io = req.app.get('io');
    io.emit('tripStarted', { tripId: trip._id });
    res.json(trip);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/trip/:id/complete', async (req, res) => {
  try {
    console.log(`[Trip Complete] Attempting to complete trip: ${req.params.id}`);
    const { distance, duration } = req.body;

    let trip = await Trip.findById(req.params.id);
    if (!trip) {
      console.log(`[Trip Complete] Trip not found: ${req.params.id}`);
      return res.status(404).json({ message: 'Trip not found' });
    }

    // Recalculate price if actual distance is provided
    if (distance) {
      const dist = Number(distance);
      console.log(`[Trip Complete] Recalculating price for distance: ${dist} km`);
      
      let pricingRule = null;
      // Try to find pricing rule for the vehicle type
      // Note: trip.vehicleModel might need to be populated or ensured it exists
      // If not on trip, we might need to look up the driver's vehicle type
      
      let vehicleType = trip.vehicleModel;
      if (!vehicleType && trip.driver) {
         const driver = await Driver.findById(trip.driver);
         if (driver) vehicleType = driver.vehicleType;
      }

      if (vehicleType) {
        pricingRule = await Pricing.findOne({ vehicleType: vehicleType });
      }

      let newPrice = trip.price;

      if (pricingRule) {
        let calculatedPrice = pricingRule.basePrice;
        if (dist > 4) {
          calculatedPrice += (dist - 4) * pricingRule.pricePerKm;
        }
        newPrice = Math.ceil(calculatedPrice / 100) * 100; // Round to nearest 100
      } else {
        // Fallback Logic (Default Towing)
        let calculatedPrice = 80000; 
        if (dist > 4 && dist <= 20) {
          calculatedPrice += (dist - 4) * 10000;
        } else if (dist > 20) {
          calculatedPrice += (16 * 10000) + (dist - 20) * 5000;
        }
        newPrice = calculatedPrice;
      }
      
      console.log(`[Trip Complete] New Price: ${newPrice} (Old: ${trip.price})`);
      trip.price = newPrice;
      trip.distance = dist; // Update actual distance
    }

    trip.status = 'completed';
    trip.endTime = new Date();
    trip = await trip.save(); // Save changes
    
    console.log(`[Trip Complete] Trip updated. Price: ${trip.price}, Driver: ${trip.driver}`);

    // Update driver earnings and deduct commission
    if (trip.driver) {
      const commissionRate = 0.10; // 10%
      const price = Number(trip.price) || 0; // Ensure number
      const commission = price * commissionRate;
      console.log(`[Trip Complete] Calculating commission: ${commission} (Rate: ${commissionRate}, Price: ${price})`);

      const updateResult = await Driver.findByIdAndUpdate(trip.driver, {
        $inc: {
          'earnings.total': price,
          'earnings.daily': price,
          'earnings.weekly': price,
          'wallet.balance': -commission // Deduct commission
        },
        $push: {
          'wallet.transactions': {
            type: 'debit',
            amount: commission,
            description: `Commission for trip #${trip._id.toString().slice(-6)} (${price}₮)`,
            date: new Date()
          }
        }
      }, { new: true }); // Get updated driver to log

      console.log(`[Trip Complete] Driver wallet updated. New Balance: ${updateResult?.wallet?.balance}`);

      // Emit wallet update to the driver
      const updatedDriver = await Driver.findById(trip.driver).select('wallet');
      const io = req.app.get('io');
      io.emit('walletUpdated', { 
        driverId: trip.driver.toString(),
        balance: updatedDriver.wallet.balance,
        transactions: updatedDriver.wallet.transactions 
      });
      console.log(`[Trip Complete] Wallet update emitted for driver: ${trip.driver}`);
    } else {
      console.log(`[Trip Complete] No driver assigned to trip ${trip._id}`);
    }

    const io = req.app.get('io');
    io.emit('tripCompleted', { tripId: trip._id });
    res.json(trip);
  } catch (err) {
    console.error(`[Trip Complete] Error:`, err);
    res.status(500).json({ error: err.message });
  }
});

// Get Wallet Info
router.get('/driver/:id/wallet', async (req, res) => {
  if (isOffline()) {
    const driver = mockDrivers.find(d => d._id === req.params.id);
    return driver ? res.json(driver.wallet) : res.status(404).json({ message: 'Not found' });
  }

  try {
    const driver = await Driver.findById(req.params.id);
    if (!driver) return res.status(404).json({ message: 'Driver not found' });
    
    // Ensure wallet exists (migration for old records)
    if (!driver.wallet) {
      driver.wallet = { balance: 0, transactions: [] };
      await driver.save();
    }
    
    res.json(driver.wallet);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Recharge Wallet (Mock simulation)
router.post('/driver/:id/wallet/recharge', async (req, res) => {
  const { amount, method } = req.body; // amount is in number
  
  if (isOffline()) {
    const driver = mockDrivers.find(d => d._id === req.params.id);
    if (driver) {
      if (!driver.wallet) driver.wallet = { balance: 0, transactions: [] };
      driver.wallet.balance += amount;
      driver.wallet.transactions.unshift({
        type: 'credit',
        amount: amount,
        description: `Top-up via ${method || 'Card'}`,
        date: new Date()
      });
      return res.json(driver.wallet);
    }
    return res.status(404).json({ message: 'Not found' });
  }

  try {
    const driver = await Driver.findById(req.params.id);
    if (!driver) return res.status(404).json({ message: 'Driver not found' });
    
    if (!driver.wallet) driver.wallet = { balance: 0, transactions: [] };
    
    driver.wallet.balance += Number(amount);
    driver.wallet.transactions.unshift({
      type: 'credit',
      amount: Number(amount),
      description: `Цэнэглэлт: ${method || 'Картаар'}`,
      date: new Date()
    });
    
    await driver.save();
    res.json(driver.wallet);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin: Get All Transactions & Stats
router.get('/admin/transactions', async (req, res) => {
  if (isOffline()) {
    // Mock data for offline mode
    return res.json({
      stats: {
        totalRevenue: 45231890,
        totalPayouts: 32000000
      },
      transactions: [
        {
          id: "TRX-MOCK-1",
          driver: "Offline Driver",
          amount: 150000,
          type: "credit",
          status: "completed",
          date: new Date(),
          method: "Card"
        }
      ]
    });
  }

  try {
    const { startDate, endDate } = req.query;
    
    // Date filter setup
    let dateStart, dateEnd;
    if (startDate && endDate) {
      dateStart = new Date(startDate);
      dateEnd = new Date(new Date(endDate).setHours(23, 59, 59, 999));
    }

    const drivers = await Driver.find({ 'wallet.transactions': { $exists: true, $not: { $size: 0 } } });
    
    let allTransactions = [];
    let totalWalletCredits = 0; // Money entering system via wallet recharge
    let totalWalletDebits = 0;  // Money leaving wallet
    let totalCurrentBalance = 0; // Real-time balance sum

    drivers.forEach(driver => {
      // Sum current balance (always current, not filtered)
      totalCurrentBalance += (driver.wallet?.balance || 0);

      if (driver.wallet && driver.wallet.transactions) {
        driver.wallet.transactions.forEach(tx => {
          const txDate = new Date(tx.date);
          
          // Apply Date Filter if exists
          if (dateStart && dateEnd) {
            if (txDate < dateStart || txDate > dateEnd) return;
          }

          allTransactions.push({
            id: tx._id,
            driver: driver.name,
            driverId: driver._id,
            email: driver.email,
            amount: tx.amount,
            type: tx.type, // 'credit' or 'debit'
            description: tx.description,
            date: tx.date,
            method: 'Wallet',
            status: 'completed'
          });

          if (tx.type === 'credit') totalWalletCredits += Number(tx.amount || 0);
          if (tx.type === 'debit') totalWalletDebits += Number(tx.amount || 0);
        });
      }
    });

    // Sort by date desc
    allTransactions.sort((a, b) => new Date(b.date) - new Date(a.date));

    // Get Total Revenue from Trips (Platform Revenue)
    let tripFilter = { status: 'completed' };
    if (dateStart && dateEnd) {
      tripFilter.createdAt = { $gte: dateStart, $lte: dateEnd };
    }
    
    const completedTrips = await Trip.find(tripFilter);
    const totalTripRevenue = completedTrips.reduce((acc, trip) => acc + (trip.price || 0), 0);

    res.json({
      stats: {
        totalRevenue: totalTripRevenue, // Total value of trips in period
        totalWalletDeposits: totalWalletCredits, // Total money loaded into wallets in period
        totalWalletDebits: totalWalletDebits, // Total commissions/withdrawals in period
        totalCurrentBalance: totalCurrentBalance, // Actual money currently in driver wallets (Snapshot)
        transactionCount: allTransactions.length
      },
      transactions: allTransactions
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/admin/revenue-chart', async (req, res) => {
  if (isOffline()) {
      const data = Array.from({ length: 12 }, (_, i) => ({
          name: `${i + 1}-р сар`,
          total: Math.floor(Math.random() * 5000000) + 1000000,
      }));
      return res.json(data);
  }
  try {
      const currentYear = new Date().getFullYear();
      const revenue = await Trip.aggregate([
          {
              $match: {
                  status: 'completed',
                  createdAt: {
                      $gte: new Date(`${currentYear}-01-01`),
                      $lte: new Date(`${currentYear}-12-31`)
                  }
              }
          },
          {
              $group: {
                  _id: { $month: "$createdAt" },
                  total: { $sum: "$price" }
              }
          },
          { $sort: { _id: 1 } }
      ]);

      // Format for frontend: [{ name: "1-р сар", total: 1000 }, ...]
      const formattedData = Array.from({ length: 12 }, (_, i) => {
          const monthData = revenue.find(r => r._id === i + 1);
          return {
              name: `${i + 1}-р сар`,
              total: monthData ? monthData.total : 0
          };
      });

      res.json(formattedData);
  } catch (err) {
      res.status(500).json({ error: err.message });
  }
});

// --- ADMIN DOCUMENT ENDPOINTS ---

router.get('/admin/documents', async (req, res) => {
  if (isOffline()) return res.json([]);

  try {
    const drivers = await Driver.find({ 
      $or: [
        { 'documents.license.url': { $exists: true } },
        { 'documents.vehicleRegistration.url': { $exists: true } },
        { 'documents.insurance.url': { $exists: true } }
      ]
    });

    const allDocs = [];
    drivers.forEach(d => {
      const docTypes = ['license', 'vehicleRegistration', 'insurance'];
      docTypes.forEach(type => {
        if (d.documents && d.documents[type] && d.documents[type].url) {
           allDocs.push({
             id: `${d._id}_${type}`,
             driverId: d._id,
             driver: d.name,
             type: type,
             status: d.documents[type].status,
             submittedDate: d.createdAt, // Ideally track updated time
             image: d.documents[type].url
           });
        }
      });
    });

    res.json(allDocs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/admin/documents/:driverId/:docType/status', async (req, res) => {
  if (isOffline()) return res.json({ success: true });

  try {
    const { driverId, docType } = req.params;
    const { status } = req.body; // 'approved' or 'rejected'
    
    if (!['license', 'vehicleRegistration', 'insurance'].includes(docType)) {
      return res.status(400).json({ message: 'Invalid document type' });
    }

    const updateField = {};
    updateField[`documents.${docType}.status`] = status;
    
    const driver = await Driver.findByIdAndUpdate(driverId, { $set: updateField }, { new: true });
    
    // Check if all docs are approved to verify driver
    if (driver.documents.license?.status === 'approved' && 
        driver.documents.vehicleRegistration?.status === 'approved') {
       driver.documents.isVerified = true;
       await driver.save();
    }

    res.json(driver);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// --- PRICING API ---

// Get all pricing rules
router.get('/admin/pricing', async (req, res) => {
  try {
    let rules = await Pricing.find().sort('order');
    if (rules.length === 0) {
      // Seed default rules if empty
      const defaultRules = [
        { vehicleType: 'Суудлын машин (Дунд SUV)', basePrice: 80000, pricePerKm: 10000, order: 1 },
        { vehicleType: 'Том SUV / Pickup', basePrice: 100000, pricePerKm: 15000, order: 2 },
        { vehicleType: 'Micro автобус / Porter / Bongo', basePrice: 120000, pricePerKm: 20000, order: 3 },
        { vehicleType: '5 тонн хүртэл ачааны машин', basePrice: 180000, pricePerKm: 25000, order: 4 },
        { vehicleType: 'Том оврын Truck', basePrice: 250000, pricePerKm: 35000, order: 5 },
        { vehicleType: 'Bobcat техник', basePrice: 220000, pricePerKm: 30000, order: 6 }
      ];
      rules = await Pricing.insertMany(defaultRules);
    }
    res.json(rules);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update pricing rule
router.put('/admin/pricing/:id', async (req, res) => {
  try {
    const rule = await Pricing.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(rule);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Driver Stats Endpoint
router.get('/driver/:id/stats', async (req, res) => {
  if (isOffline()) {
    const driver = mockDrivers.find(d => d._id === req.params.id);
    if (!driver) return res.status(404).json({ message: 'Driver not found' });
    return res.json({
      today: { trips: 5, earnings: 125000 },
      month: { trips: 45, earnings: 1500000 },
      total: { trips: 120, earnings: 3500000 }
    });
  }
  try {
    const driverId = req.params.id;
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const stats = await Trip.aggregate([
      { $match: { driver: new mongoose.Types.ObjectId(driverId), status: 'completed' } },
      { $group: {
          _id: null,
          totalTrips: { $sum: 1 },
          totalEarnings: { $sum: '$price' },
          todayTrips: { $sum: { $cond: [{ $gte: ['$createdAt', startOfDay] }, 1, 0] } },
          todayEarnings: { $sum: { $cond: [{ $gte: ['$createdAt', startOfDay] }, '$price', 0] } },
          monthTrips: { $sum: { $cond: [{ $gte: ['$createdAt', startOfMonth] }, 1, 0] } },
          monthEarnings: { $sum: { $cond: [{ $gte: ['$createdAt', startOfMonth] }, '$price', 0] } }
        }
      }
    ]);

    if (stats.length > 0) {
      res.json({
        today: { trips: stats[0].todayTrips, earnings: stats[0].todayEarnings },
        month: { trips: stats[0].monthTrips, earnings: stats[0].monthEarnings },
        total: { trips: stats[0].totalTrips, earnings: stats[0].totalEarnings }
      });
    } else {
      res.json({
        today: { trips: 0, earnings: 0 },
        month: { trips: 0, earnings: 0 },
        total: { trips: 0, earnings: 0 }
      });
    }
  } catch (err) {
    console.error('Stats Error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
