const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Driver = require('../models/Driver');
const Customer = require('../models/Customer');
const Trip = require('../models/Trip');
const Pricing = require('../models/Pricing');
const AdditionalService = require('../models/AdditionalService');
const Invoice = require('../models/Invoice');
const { Expo } = require('expo-server-sdk');
const expo = new Expo();
const qpayService = require('../utils/qpay');

// Helper: Send Push Notification
const sendPushNotification = async (pushToken, title, body, data) => {
  if (!Expo.isExpoPushToken(pushToken)) {
    console.error(`Push token ${pushToken} is not a valid Expo push token`);
    return;
  }
  
  const messages = [{
    to: pushToken,
    sound: 'default',
    title: title,
    body: body,
    data: data,
    priority: 'high',
    channelId: 'default',
  }];

  try {
    const ticketChunk = await expo.sendPushNotificationsAsync(messages);
    console.log('Push notification sent:', ticketChunk);
  } catch (error) {
    console.error('Error sending push notification:', error);
  }
};

// Helper: Calculate distance between two coordinates in km
function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radius of the earth in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c; // Distance in km
}

// --- MOCK DATA STORE (For Offline Mode) ---
// DISABLED BY USER REQUEST - STRICT REAL DATA MODE
let mockDrivers = [];

// Helper to check offline mode (controlled by server.js)
// Always false because we exit process if DB fails
const isOffline = () => false;

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

// Customer Wallet Top Up
router.post('/customer/wallet/topup', async (req, res) => {
  try {
    const { customerId, amount } = req.body;
    
    if (!customerId || !amount || amount <= 0) {
      return res.status(400).json({ message: 'Invalid amount or customer ID' });
    }

    if (isOffline()) {
       // Mock handling if needed, but for now we focus on online
       return res.status(501).json({ message: 'Not implemented in offline mode' });
    }

    const customer = await Customer.findById(customerId);
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    customer.wallet = (customer.wallet || 0) + Number(amount);
    await customer.save();

    res.json({ success: true, wallet: customer.wallet, message: 'Wallet updated successfully' });
  } catch (error) {
    console.error('Wallet topup error:', error);
    res.status(500).json({ message: 'Server error' });
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
    
    // Check if verification is required for going online
    if (isOnline) {
        const driver = await Driver.findById(req.params.id);
        if (!driver) return res.status(404).json({ message: 'Driver not found' });
        
        const docs = driver.documents || {};
        const isVerified = docs.isVerified || (
            docs.license?.status === 'approved' && 
            docs.vehicleRegistration?.status === 'approved' && 
            docs.insurance?.status === 'approved'
        );

        if (!isVerified) {
            return res.status(403).json({ message: 'Бичиг баримт баталгаажаагүй байна.' });
        }
    }

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

// Save Push Token (Driver)
router.post('/driver/push-token', async (req, res) => {
  const { driverId, token } = req.body;
  try {
    await Driver.findByIdAndUpdate(driverId, { pushToken: token });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Save Push Token (Customer)
router.post('/customer/push-token', async (req, res) => {
  const { customerId, token } = req.body;
  try {
    await require('../models/Customer').findByIdAndUpdate(customerId, { pushToken: token });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin Get All Drivers
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
    const driver = mockDrivers.find(d => d._id === req.params.id);
    if (driver) {
      Object.assign(driver, req.body);
      return res.json(driver);
    }
    return res.status(404).json({ message: 'Driver not found' });
  }
  try {
    const driver = await Driver.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!driver) return res.status(404).json({ message: 'Driver not found' });
    res.json(driver);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin Get Documents (Drivers with docs)
router.get('/admin/documents', async (req, res) => {
    if (isOffline()) {
        return res.json(mockDrivers);
    }
    try {
        const drivers = await Driver.find().select('name phone vehicleType documents createdAt status');
        res.json(drivers);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Admin Update Document Status
router.post('/admin/documents/:id/:docType/status', async (req, res) => {
    const { id, docType } = req.params;
    const { status } = req.body;

    if (isOffline()) {
        const driver = mockDrivers.find(d => d._id === id);
        if (driver && driver.documents) {
             if (!driver.documents[docType]) driver.documents[docType] = {};
             driver.documents[docType].status = status;
             return res.json(driver);
        }
        return res.status(404).json({ message: 'Driver not found' });
    }

    try {
        const updateField = {};
        updateField[`documents.${docType}.status`] = status;
        
        const driver = await Driver.findByIdAndUpdate(id, { $set: updateField }, { new: true });
        
        if (!driver) return res.status(404).json({ message: 'Driver not found' });
        
        res.json(driver);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Admin Stats
router.get('/admin/stats', async (req, res) => {
    if (isOffline()) {
        return res.json({
            activeDrivers: 12,
            onlineDrivers: 5,
            todayRequests: 25,
            totalRevenue: 1500000
        });
    }
    try {
        const { startDate, endDate } = req.query;
        const start = startDate ? new Date(startDate) : new Date(0);
        const end = endDate ? new Date(endDate) : new Date();
        end.setHours(23, 59, 59, 999);

        const activeDrivers = await Driver.countDocuments({ status: 'active' });
        const onlineDrivers = await Driver.countDocuments({ isOnline: true });
        
        // Today's requests
        const todayStart = new Date();
        todayStart.setHours(0,0,0,0);
        const todayRequests = await Trip.countDocuments({ createdAt: { $gte: todayStart } });

        // Total Revenue (from completed trips)
        const revenueAgg = await Trip.aggregate([
            { $match: { 
                status: 'completed',
                createdAt: { $gte: start, $lte: end }
            }},
            { $group: { _id: null, total: { $sum: "$price" } } }
        ]);
        const totalRevenue = revenueAgg.length > 0 ? revenueAgg[0].total : 0;

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

// Admin Revenue Chart (Monthly)
router.get('/admin/revenue-chart', async (req, res) => {
    if (isOffline()) {
        return res.json([
            { name: 'Jan', total: 100000 },
            { name: 'Feb', total: 150000 },
        ]);
    }
    try {
        const currentYear = new Date().getFullYear();
        const revenue = await Trip.aggregate([
            { $match: { 
                status: 'completed',
                createdAt: { $gte: new Date(`${currentYear}-01-01`), $lte: new Date(`${currentYear}-12-31`) }
            }},
            { $group: { 
                _id: { $month: "$createdAt" }, 
                total: { $sum: "$price" } 
            }},
            { $sort: { _id: 1 } }
        ]);

        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const data = months.map((m, index) => {
            const found = revenue.find(r => r._id === (index + 1));
            return { name: m, total: found ? found.total : 0 };
        });

        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Admin Transactions
router.get('/admin/transactions', async (req, res) => {
    if (isOffline()) {
        return res.json({ transactions: [], stats: { totalRevenue: 0, totalWalletDeposits: 0, totalWalletDebits: 0, totalCurrentBalance: 0, transactionCount: 0 } });
    }
    try {
        const { startDate, endDate } = req.query;
        const start = startDate ? new Date(startDate) : new Date(0);
        const end = endDate ? new Date(endDate) : new Date();
        end.setHours(23, 59, 59, 999);

        const drivers = await Driver.find({ 
            'wallet.transactions.date': { $gte: start, $lte: end } 
        }).select('name email wallet');

        let transactions = [];
        let totalWalletDeposits = 0;
        let totalWalletDebits = 0;

        drivers.forEach(d => {
            if (d.wallet && d.wallet.transactions) {
                d.wallet.transactions.forEach(t => {
                    if (new Date(t.date) >= start && new Date(t.date) <= end) {
                        transactions.push({
                            date: t.date,
                            driver: d.name,
                            email: d.email,
                            type: t.type,
                            amount: t.amount,
                            description: t.description,
                            status: 'completed'
                        });
                        if (t.type === 'credit') totalWalletDeposits += t.amount;
                        if (t.type === 'debit') totalWalletDebits += t.amount;
                    }
                });
            }
        });

        transactions.sort((a, b) => new Date(b.date) - new Date(a.date));

        // Total Revenue (from completed trips)
        const revenueAgg = await Trip.aggregate([
            { $match: { 
                status: 'completed',
                createdAt: { $gte: start, $lte: end }
            }},
            { $group: { _id: null, total: { $sum: "$price" } } }
        ]);
        const totalRevenue = revenueAgg.length > 0 ? revenueAgg[0].total : 0;

        // Total Current Balance of all drivers
        const balanceAgg = await Driver.aggregate([
            { $group: { _id: null, total: { $sum: "$wallet.balance" } } }
        ]);
        const totalCurrentBalance = balanceAgg.length > 0 ? balanceAgg[0].total : 0;

        res.json({ 
            transactions,
            stats: {
                totalRevenue,
                totalWalletDeposits,
                totalWalletDebits,
                totalCurrentBalance,
                transactionCount: transactions.length
            }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- PRICING & SERVICES ---

// Get Pricing Rules
router.get('/admin/pricing', async (req, res) => {
    try {
        const rules = await Pricing.find();
        res.json(rules);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update Pricing Rule
router.put('/admin/pricing/:id', async (req, res) => {
    try {
        const rule = await Pricing.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json(rule);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get Additional Services
router.get('/admin/additional-services', async (req, res) => {
    try {
        const services = await AdditionalService.find();
        res.json(services);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Add Additional Service
router.post('/admin/additional-services', async (req, res) => {
    try {
        const service = new AdditionalService(req.body);
        await service.save();
        res.json(service);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Delete Additional Service
router.delete('/admin/additional-services/:id', async (req, res) => {
    try {
        await AdditionalService.findByIdAndDelete(req.params.id);
        res.json({ message: 'Deleted' });
    } catch (err) {
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

    // Add additional services price if any
    if (tripData.additionalServices && tripData.additionalServices.length > 0) {
      const additionalCost = tripData.additionalServices.reduce((sum, service) => sum + (Number(service.price) || 0), 0);
      tripData.price = (Number(tripData.price) || 0) + additionalCost;
    }

    // Prepayment Logic (TEMPORARILY DISABLED)
    const prepaymentPercentage = 0; // Was 0.10
    const prepaymentAmount = 0;
    
    tripData.prepaymentAmount = prepaymentAmount;
    tripData.remainingAmount = tripData.price;
    tripData.status = 'pending';
    tripData.paymentStatus = 'pending';

    const trip = new Trip(tripData);
    await trip.save();
    
    // Broadcast logic (Copied from confirm-payment)
    const io = req.app.get('io');
    const driverLocations = req.app.driverLocations || {};
    const pickupLat = trip.pickupLocation.lat;
    const pickupLng = trip.pickupLocation.lng;
    let matchedDrivers = 0;
    const nearbyDriverIds = [];

    console.log(`[Trip Request] Finding drivers near ${pickupLat}, ${pickupLng} within 5km...`);

    // 1. Identify drivers within range
    Object.keys(driverLocations).forEach(driverId => {
      const loc = driverLocations[driverId];
      if (loc && (loc.latitude || loc.lat) && (loc.longitude || loc.lng)) {
         const dLat = loc.latitude || loc.lat;
         const dLng = loc.longitude || loc.lng;
         
         const dist = getDistance(pickupLat, pickupLng, dLat, dLng);
         if (dist <= 10) { // Increased to 10km
            nearbyDriverIds.push(driverId);
         }
      }
    });

    // 2. Filter drivers by Vehicle Type and Dispatch
    if (nearbyDriverIds.length > 0) {
        try {
            const drivers = await Driver.find({ _id: { $in: nearbyDriverIds } });
            
            drivers.forEach(driver => {
                const vehicleType = driver.vehicleType || 'Ride';
                const role = driver.role || 'taxi'; 
                let isCompatible = false;

                if (trip.serviceType === 'Tow' || trip.serviceType === 'sos') {
                    isCompatible = (vehicleType === 'Tow' || vehicleType === 'SOS' || vehicleType === 'sos' || role === 'tow');
                } else if (trip.serviceType === 'delivery') {
                    isCompatible = (vehicleType === 'Cargo' || vehicleType === 'Delivery' || role === 'delivery');
                } else {
                    isCompatible = (vehicleType === 'Ride' || vehicleType === 'Taxi' || vehicleType === 'Sedan' || role === 'taxi');
                }

                if (isCompatible) {
                    console.log(` -> Match: Driver ${driver._id} (${vehicleType}/${role}) is compatible.`);
                    io.to(`driver_${driver._id}`).emit('newJobRequest', trip);
                    matchedDrivers++;

                    if (driver.pushToken) {
                        sendPushNotification(
                            driver.pushToken, 
                            "🔔 Шинэ дуудлага!", 
                            `${trip.pickupLocation?.address || 'Хаяг тодорхойгүй'} -> ${trip.dropoffLocation?.address || 'Хаяг тодорхойгүй'}`,
                            { tripId: trip._id }
                        );
                    }
                }
            });
        } catch (err) {
            console.error("Error filtering drivers by role:", err);
        }
    }

    // Always notify admin
    io.to('admin_room').emit('newJobRequest', trip);
    
    res.json({
      ...trip.toObject(),
      requiresPayment: false,
      prepaymentAmount
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Confirm Prepayment
router.post('/trip/:id/confirm-payment', async (req, res) => {
  try {
    const tripId = req.params.id;
    
    const trip = await Trip.findById(tripId);
    if (!trip) return res.status(404).json({ message: 'Trip not found' });

    // Wallet Deduction Logic
    if (trip.customer) {
      const customer = await Customer.findById(trip.customer);
      if (customer) {
        console.log(`[Payment Debug] Customer Wallet: ${customer.wallet}, Trip Prepayment: ${trip.prepaymentAmount}`);
        
        if ((customer.wallet || 0) < trip.prepaymentAmount) {
           return res.status(400).json({ 
             message: `Дансны үлдэгдэл хүрэлцэхгүй байна. Таны үлдэгдэл: ${customer.wallet || 0}₮, Төлөх дүн: ${trip.prepaymentAmount}₮. Та цэнэглэнэ үү.` 
           });
        }
        customer.wallet -= trip.prepaymentAmount;
        await customer.save();
        console.log(`[Payment] Deducted ${trip.prepaymentAmount} from Customer ${customer.phone}. New Balance: ${customer.wallet}`);
      }
    }
    
    trip.status = 'pending';
    trip.paymentStatus = 'partial_paid';
    await trip.save();

    const io = req.app.get('io');
    
    // Broadcast logic: 5km radius (Moved from trip/request)
    const driverLocations = req.app.driverLocations || {};
    const pickupLat = trip.pickupLocation.lat;
    const pickupLng = trip.pickupLocation.lng;
    let matchedDrivers = 0;
    const nearbyDriverIds = [];

    console.log(`[Trip Paid] Finding drivers near ${pickupLat}, ${pickupLng} within 10km...`);

    // 1. Identify drivers within range
    Object.keys(driverLocations).forEach(driverId => {
      const loc = driverLocations[driverId];
      if (loc && (loc.latitude || loc.lat) && (loc.longitude || loc.lng)) {
         const dLat = loc.latitude || loc.lat;
         const dLng = loc.longitude || loc.lng;
         
         const dist = getDistance(pickupLat, pickupLng, dLat, dLng);
         if (dist <= 10) { // Increased to 10km
            nearbyDriverIds.push(driverId);
         }
      }
    });

    // 2. Filter drivers by Vehicle Type and Dispatch
    if (nearbyDriverIds.length > 0) {
        try {
            const drivers = await Driver.find({ _id: { $in: nearbyDriverIds } });
            
            drivers.forEach(driver => {
                const vehicleType = driver.vehicleType || 'Ride'; // Default to Ride (Taxi)
                const role = driver.role || 'taxi';
                let isCompatible = false;

                // Compatibility Logic
                // Tow requests -> Tow vehicle drivers only
                if (trip.serviceType === 'Tow' || trip.serviceType === 'sos') {
                     isCompatible = (vehicleType === 'Tow' || vehicleType === 'SOS' || vehicleType === 'sos' || role === 'tow');
                } else if (trip.serviceType === 'delivery') {
                    // Delivery -> Cargo
                    isCompatible = (vehicleType === 'Cargo' || vehicleType === 'Delivery' || role === 'delivery');
                } else {
                    // All other requests (Taxi) -> Ride vehicle drivers only
                    isCompatible = (vehicleType === 'Ride' || vehicleType === 'Taxi' || vehicleType === 'Sedan' || role === 'taxi');
                }

                if (isCompatible) {
                    console.log(` -> Match: Driver ${driver._id} (${vehicleType}/${role}) is compatible.`);
                    io.to(`driver_${driver._id}`).emit('newJobRequest', trip);
                    matchedDrivers++;

                    // Send Push Notification
                    if (driver.pushToken) {
                        sendPushNotification(
                            driver.pushToken, 
                            "🔔 Шинэ дуудлага!", 
                            `${trip.pickupLocation?.address || 'Хаяг тодорхойгүй'} -> ${trip.dropoffLocation?.address || 'Хаяг тодорхойгүй'}`,
                            { tripId: trip._id }
                        );
                    }
                }
            });
        } catch (err) {
            console.error("Error filtering drivers by role:", err);
        }
    }

    console.log(`[Trip Paid] Sent to ${matchedDrivers} drivers.`);

    // Always notify admin
    io.to('admin_room').emit('newJobRequest', trip);
    
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

router.post('/trip/:id/cancel', async (req, res) => {
  try {
    const trip = await Trip.findByIdAndUpdate(req.params.id, { 
      status: 'cancelled' 
    }, { new: true });
    
    if (!trip) return res.status(404).json({ message: 'Trip not found' });
    
    const io = req.app.get('io');
    io.emit('tripUpdated', trip);
    if (trip.driver) {
      io.to(`driver_${trip.driver}`).emit('jobCancelled', { tripId: req.params.id });
      // Send Push
      Driver.findById(trip.driver).then(driver => {
          if (driver && driver.pushToken) {
              sendPushNotification(
                  driver.pushToken,
                  "Аялал цуцлагдлаа",
                  "Захиалагч аяллаа цуцаллаа.",
                  { tripId: req.params.id }
              );
          }
      });
    } else {
        // If no driver assigned yet, we should also emit to remove it from available jobs
        io.emit('jobCancelled', { tripId: req.params.id });
    }

    // Notify customer
    if (trip.customer) {
      io.to(`customer_${trip.customer}`).emit('jobCancelled', { tripId: req.params.id });
    }

    res.json(trip);
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

    // Notify Customer via Push
    if (trip.customer) {
        require('../models/Customer').findById(trip.customer).then(customer => {
            if (customer && customer.pushToken) {
                sendPushNotification(
                    customer.pushToken,
                    "Жолооч олдлоо! 🚕",
                    `Жолооч ${driver.name} таны дуудлагыг хүлээж авлаа.`,
                    { tripId: trip._id, status: 'accepted' }
                );
            }
        });
    }

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

    // Notify Customer via Push
    if (trip.customer) {
        require('../models/Customer').findById(trip.customer).then(customer => {
            if (customer && customer.pushToken) {
                sendPushNotification(
                    customer.pushToken,
                    "Аялал эхэллээ 🏁",
                    "Таны аялал эхэллээ. Сайхан аялаарай!",
                    { tripId: trip._id, status: 'in_progress' }
                );
            }
        });
    }

    res.json(trip);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/trip/:id/update-distance', async (req, res) => {
  try {
    const { distance } = req.body;
    const trip = await Trip.findByIdAndUpdate(req.params.id, { 
      traveledDistance: distance 
    }, { new: true });
    
    // Optional: emit socket event if needed for realtime dashboard
    // const io = req.app.get('io');
    // io.emit('tripDistanceUpdated', { tripId: trip._id, distance });
    
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
      
      // Add additional services price
      if (trip.additionalServices && trip.additionalServices.length > 0) {
        const additionalCost = trip.additionalServices.reduce((sum, service) => sum + (Number(service.price) || 0), 0);
        newPrice += additionalCost;
      }
      
      console.log(`[Trip Complete] New Price: ${newPrice} (Old: ${trip.price})`);
      trip.price = newPrice;
      trip.distance = dist; // Update actual distance
      trip.traveledDistance = dist; // Update traveled distance to match final
    }

    if (duration) {
       trip.duration = Math.round(Number(duration) / 60); // Convert seconds to minutes
    }

    trip.status = 'completed';
    trip.endTime = new Date();
    trip = await trip.save(); // Save changes
    
    console.log(`[Trip Complete] Trip updated. Price: ${trip.price}, Driver: ${trip.driver}`);

    // Update driver earnings and deduct commission
    if (trip.driver) {
      const commissionRate = 0.12; // 12%
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

      // --- REFERRAL BONUS LOGIC ---
      if (trip.createdByDriver && trip.createdByDriver.toString() !== trip.driver.toString()) {
         const bonusAmount = 5000;
         console.log(`[Trip Complete] Bonus Logic: Trip created by ${trip.createdByDriver}. Adding ${bonusAmount} bonus.`);
         
         const bonusResult = await Driver.findByIdAndUpdate(trip.createdByDriver, {
            $inc: { 'wallet.balance': bonusAmount },
            $push: {
              'wallet.transactions': {
                type: 'credit',
                amount: bonusAmount,
                description: `Bonus for shared trip #${trip._id.toString().slice(-6)}`,
                date: new Date()
              }
            }
         }, { new: true });
         
         if (bonusResult) {
             io.emit('walletUpdated', {
                 driverId: trip.createdByDriver.toString(),
                 balance: bonusResult.wallet.balance,
                 transactions: bonusResult.wallet.transactions
             });
             // Also notify via socket/push if possible
             io.to(`driver_${trip.createdByDriver}`).emit('notification', {
                 title: 'Бонус орлоо!',
                 message: `Таны хуваалцсан аялал амжилттай дууслаа. +${bonusAmount}₮`
             });
         }
      }
      // ----------------------------

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

// Driver Share Trip (Create Trip)
router.post('/driver/trip/share', async (req, res) => {
  try {
    const { driverId, pickup, dropoff, price, distance, duration, serviceType } = req.body;
    
    // Basic validation
    if (!driverId) return res.status(400).json({ message: 'Driver ID is required' });
    if (!pickup || !dropoff) return res.status(400).json({ message: 'Pickup and Dropoff locations are required' });
    if (!price) return res.status(400).json({ message: 'Price is required' });

    // Validate driver
    const creatorDriver = await Driver.findById(driverId);
    if (!creatorDriver) return res.status(404).json({ message: 'Driver not found' });

    const newTrip = new Trip({
      createdByDriver: driverId,
      pickupLocation: pickup,
      dropoffLocation: dropoff,
      price: Number(price) || 0,
      serviceType: serviceType || 'taxi', // Default
      distance: Number(distance) || 0,
      duration: Number(duration) || 0,
      status: 'pending',
      paymentStatus: 'pending', // Assume cash or handled separately
      createdAt: new Date()
    });

    const trip = await newTrip.save();
    console.log(`[Share Trip] Trip created by driver ${driverId}: ${trip._id}`);

    // Dispatch Logic (Find nearby drivers)
    // Reuse similar logic from /rides/request
    const io = req.app.get('io');
    const driverLocations = req.app.driverLocations || {};
    const pickupLat = pickup.lat;
    const pickupLng = pickup.lng;
    
    // Simple dispatch for now: Broadcast to all compatible drivers except creator
    // In production, use geospatial query
    
    // 1. Identify drivers (mock or real)
    let nearbyDriverIds = [];
    if (pickupLat && pickupLng) {
        Object.keys(driverLocations).forEach(dId => {
          // Don't send to self
          if (dId === driverId) return;
    
          const loc = driverLocations[dId];
          if (loc && (loc.latitude || loc.lat) && (loc.longitude || loc.lng)) {
             const dLat = loc.latitude || loc.lat;
             const dLng = loc.longitude || loc.lng;
             const dist = getDistance(pickupLat, pickupLng, dLat, dLng);
             
             // Search radius 10km for shared trips (wider range)
             if (dist <= 10) {
                nearbyDriverIds.push(dId);
             }
          }
        });
    } else {
        // If no coordinates, maybe broadcast to all active drivers? 
        // Or just skip location filter and send to all active.
        // For now, let's just find all active drivers if no coords provided (fallback)
         Object.keys(driverLocations).forEach(dId => {
            if (dId !== driverId) nearbyDriverIds.push(dId);
         });
    }

    let matchedDrivers = 0;
    if (nearbyDriverIds.length > 0) {
        const drivers = await Driver.find({ _id: { $in: nearbyDriverIds } });
        drivers.forEach(driver => {
            // Check Role Compatibility via Vehicle Type
            const vehicleType = driver.vehicleType || 'Ride';
            const role = driver.role || 'taxi'; // Added role support
            let isCompatible = false;
            
            if (trip.serviceType === 'Tow' || trip.serviceType === 'sos') {
                isCompatible = (vehicleType === 'Tow' || vehicleType === 'SOS' || vehicleType === 'sos' || role === 'tow');
            } else if (trip.serviceType === 'delivery') {
                isCompatible = (vehicleType === 'Cargo' || vehicleType === 'Delivery' || role === 'delivery');
            } else {
                // Taxi/Ride
                isCompatible = (vehicleType === 'Ride' || vehicleType === 'Taxi' || vehicleType === 'Sedan' || role === 'taxi');
            }

            if (isCompatible) {
                io.to(`driver_${driver._id}`).emit('newJobRequest', trip);
                matchedDrivers++;
                
                if (driver.pushToken) {
                     sendPushNotification(
                         driver.pushToken, 
                         "🔔 Жолооч дуудлага хуваалцлаа!", 
                         `${trip.pickupLocation?.address || 'Хаяг тодорхойгүй'} -> ${trip.dropoffLocation?.address || 'Хаяг тодорхойгүй'}`,
                         { tripId: trip._id }
                     );
                }
            }
        });
    }

    console.log(`[Share Trip] Shared with ${matchedDrivers} drivers.`);
    
    // Also notify admin
    io.to('admin_room').emit('newJobRequest', trip);

    res.json(trip);
  } catch (err) {
    console.error('Share trip error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Driver Self Trip (Create & Assign to Self)
router.post('/driver/trip/self', async (req, res) => {
  try {
    const { driverId, pickup, dropoff, price, distance, duration, serviceType, customerPhone } = req.body;
    
    // Validate driver
    const driver = await Driver.findById(driverId);
    if (!driver) return res.status(404).json({ message: 'Driver not found' });

    const newTrip = new Trip({
      createdByDriver: driverId,
      driver: driverId, // Assigned immediately
      pickupLocation: pickup,
      dropoffLocation: dropoff,
      price: Number(price),
      serviceType: serviceType || 'taxi',
      distance: Number(distance),
      duration: Number(duration),
      status: 'in_progress', // Start immediately
      paymentStatus: 'pending',
      customerPhone: customerPhone || 'Street Hail',
      startTime: new Date(),
      createdAt: new Date()
    });

    const trip = await newTrip.save();
    console.log(`[Self Trip] Trip created by driver ${driverId}: ${trip._id}`);
    
    // Emit updates so the app knows to switch to active job screen
    const io = req.app.get('io');
    io.to(`driver_${driverId}`).emit('requestAssigned', trip); // Trigger ActiveJob logic
    
    res.json(trip);
  } catch (err) {
    console.error('Self trip error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get Active Job for Driver
router.get('/driver/:id/active-job', async (req, res) => {
  if (isOffline()) return res.json(null);
  
  try {
    const trip = await Trip.findOne({
      driver: req.params.id,
      status: { $in: ['accepted', 'in_progress', 'pickup'] }
    }).populate('customer');
    
    res.json(trip || null);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get Driver Wallet
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

// --- PAYMENT: QPAY INTEGRATION ---

router.post('/payment/qpay/create-invoice', async (req, res) => {
  try {
    const { driverId, amount } = req.body;
    
    if (!driverId || !amount) {
      return res.status(400).json({ message: 'Driver ID and amount are required' });
    }

    const driver = await Driver.findById(driverId);
    if (!driver) return res.status(404).json({ message: 'Driver not found' });

    // Create Invoice in QPay
    const invoiceData = await qpayService.createInvoice(amount, `Wallet Topup - ${driver.name}`, {
        name: driver.name,
        phone: driver.phone,
        email: driver.email,
        register: driver.registerNumber // Assuming this field exists or driver.licenseNumber
    });
    
    // Save Invoice to DB to link invoice_id with driverId
    const newInvoice = new Invoice({
      invoiceId: invoiceData.invoice_id,
      driverId: driver._id,
      amount: amount,
      description: `Wallet Topup - ${driver.name}`,
      status: 'pending',
      qpayResponse: invoiceData
    });
    
    await newInvoice.save();
    
    res.json(invoiceData);
  } catch (error) {
    console.error('QPay Invoice Error:', error);
    res.status(500).json({ message: 'Failed to create QPay invoice', details: error.message });
  }
});

router.post('/payment/qpay/check', async (req, res) => {
  try {
    const { invoiceId, driverId } = req.body;
    
    if (!invoiceId) {
      return res.status(400).json({ message: 'Invoice ID is required' });
    }

    // Find local invoice record
    let invoice = await Invoice.findOne({ invoiceId });
    
    // If invoice is already marked paid in DB, return success immediately
    if (invoice && invoice.status === 'paid') {
       const driver = await Driver.findById(invoice.driverId);
       return res.json({ success: true, message: 'Already processed', wallet: driver ? driver.wallet : null });
    }

    // Verify with QPay API
    const checkResult = await qpayService.checkPayment(invoiceId);
    
    let isPaid = false;
    let paidAmount = 0;

    if (checkResult && checkResult.rows && checkResult.rows.length > 0) {
       const payment = checkResult.rows[0];
       if (payment.payment_status === 'PAID') {
          isPaid = true;
          paidAmount = payment.payment_amount;
       }
    } else if (checkResult && checkResult.payment_status === 'PAID') {
        isPaid = true;
        paidAmount = checkResult.payment_amount || 0;
    }

    if (isPaid) {
       // If local invoice doesn't exist (legacy?), try to use passed driverId
       const targetDriverId = invoice ? invoice.driverId : driverId;
       
       if (!targetDriverId) {
         return res.status(400).json({ message: 'Driver ID unknown for this invoice' });
       }

       const driver = await Driver.findById(targetDriverId);
       if (!driver) return res.status(404).json({ message: 'Driver not found' });

       // Double check transaction history just in case
       const alreadyProcessed = driver.wallet.transactions.some(t => t.description.includes(invoiceId));
       
       if (alreadyProcessed) {
         // Update local invoice status if needed
         if (invoice && invoice.status !== 'paid') {
            invoice.status = 'paid';
            invoice.paidAt = new Date();
            await invoice.save();
         }
         return res.json({ success: true, message: 'Already processed', wallet: driver.wallet });
       }

       // Credit Wallet
       driver.wallet.balance += Number(paidAmount);
       driver.wallet.transactions.unshift({
          type: 'credit',
          amount: Number(paidAmount),
          description: `QPay Topup (${invoiceId})`,
          date: new Date()
       });

       await driver.save();
       
       // Update Invoice Record
       if (invoice) {
         invoice.status = 'paid';
         invoice.paidAt = new Date();
         invoice.qpayResponse = checkResult;
         await invoice.save();
       } else {
         // Create record for legacy/direct calls if missing
         await Invoice.create({
           invoiceId,
           driverId: driver._id,
           amount: paidAmount,
           status: 'paid',
           paidAt: new Date(),
           description: 'Restored from Check',
           qpayResponse: checkResult
         });
       }
       
       // Notify via socket
       const io = req.app.get('io');
       io.emit('walletUpdated', {
          driverId: driver._id,
          balance: driver.wallet.balance,
          transactions: driver.wallet.transactions
       });

       return res.json({ success: true, wallet: driver.wallet });
    } else {
       return res.json({ success: false, message: 'Payment not found or not paid yet' });
    }

  } catch (error) {
    console.error('QPay Check Error:', error);
    res.status(500).json({ message: 'Failed to check payment status' });
  }
});

router.get('/payment/qpay/callback', async (req, res) => {
    try {
        const invoiceId = req.query.invoice_id || req.query.payment_id;

        if (invoiceId) {
            console.log(`QPay Callback received for Invoice: ${invoiceId}. Checking status...`);
            
            // 1. Find the invoice to identify the driver
            const invoice = await Invoice.findOne({ invoiceId });
            
            if (invoice) {
                if (invoice.status === 'paid') {
                    console.log(`Invoice ${invoiceId} already paid.`);
                } else {
                    // 2. Check QPay status
                    const checkResult = await qpayService.checkPayment(invoiceId);
                    let isPaid = false;
                    let paidAmount = 0;

                    if (checkResult && checkResult.rows && checkResult.rows.length > 0) {
                        const payment = checkResult.rows[0];
                        if (payment.payment_status === 'PAID') {
                            isPaid = true;
                            paidAmount = payment.payment_amount;
                        }
                    } else if (checkResult && checkResult.payment_status === 'PAID') {
                        isPaid = true;
                        paidAmount = checkResult.payment_amount || 0;
                    }
                    
                    if (isPaid) {
                        // 3. Credit Driver
                        const driver = await Driver.findById(invoice.driverId);
                        if (driver) {
                             // Check for duplicates
                             const alreadyProcessed = driver.wallet.transactions.some(t => t.description.includes(invoiceId));
                             if (!alreadyProcessed) {
                                 driver.wallet.balance += Number(paidAmount);
                                 driver.wallet.transactions.unshift({
                                    type: 'credit',
                                    amount: Number(paidAmount),
                                    description: `QPay Topup (${invoiceId})`,
                                    date: new Date()
                                 });
                                 await driver.save();
                                 console.log(`Driver ${driver.name} credited ${paidAmount} via Callback.`);
                                 
                                 // Notify Socket
                                 const io = req.app.get('io');
                                 io.emit('walletUpdated', {
                                    driverId: driver._id,
                                    balance: driver.wallet.balance,
                                    transactions: driver.wallet.transactions
                                 });
                             }
                             
                             // 4. Update Invoice Status
                             invoice.status = 'paid';
                             invoice.paidAt = new Date();
                             invoice.qpayResponse = checkResult;
                             await invoice.save();
                        }
                    }
                }
            } else {
                console.warn(`Callback received for unknown invoice: ${invoiceId}`);
            }
            
            // Return success page
            return res.send(`
                <html>
                    <body style="display:flex;justify-content:center;align-items:center;height:100vh;font-family:sans-serif;background-color:#f0fdf4;">
                        <div style="text-align:center;padding:2rem;background:white;border-radius:1rem;box-shadow:0 4px 6px -1px rgb(0 0 0 / 0.1);">
                            <div style="color:#16a34a;font-size:3rem;margin-bottom:1rem;">✓</div>
                            <h1 style="color:#166534;margin-bottom:0.5rem;">Төлбөр амжилттай!</h1>
                            <p style="color:#4b5563;">Таны данс цэнэглэгдлээ. Апп руугаа буцна уу.</p>
                            <script>
                                setTimeout(function() {
                                    // Try to close window or redirect deep link if you have one
                                    // window.close();
                                }, 3000);
                            </script>
                        </div>
                    </body>
                </html>
            `);
        }
        
        res.send('Payment processing... Please return to the app.');
    } catch (error) {
        console.error('Callback Error:', error);
        res.status(500).send('Error processing payment callback');
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
    console.log('Fetching admin documents...');
    // Find drivers who have at least one document with a URL (not null)
    const drivers = await Driver.find({ 
      $or: [
        { 'documents.license.url': { $ne: null } },
        { 'documents.vehicleRegistration.url': { $ne: null } },
        { 'documents.insurance.url': { $ne: null } }
      ]
    });

    console.log(`Found ${drivers.length} drivers with documents`);

    const result = drivers.map(d => ({
      driverId: d._id,
      driverName: d.name,
      submittedDate: d.updatedAt || d.createdAt, // Use update time if available
      documents: {
        license: d.documents?.license || { status: 'pending', url: null },
        vehicleRegistration: d.documents?.vehicleRegistration || { status: 'pending', url: null },
        insurance: d.documents?.insurance || { status: 'pending', url: null }
      }
    }));

    res.json(result);
  } catch (err) {
    console.error('Error in /admin/documents:', err);
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
    
    // If rejected, set status to inactive and offline
    if (status === 'rejected') {
      updateField['status'] = 'inactive';
      updateField['isOnline'] = false;
    }
    
    const driver = await Driver.findByIdAndUpdate(driverId, { $set: updateField }, { new: true });
    
    // Check if all docs are approved to verify driver
    const allApproved = 
        driver.documents.license?.status === 'approved' && 
        driver.documents.vehicleRegistration?.status === 'approved' &&
        driver.documents.insurance?.status === 'approved';
    
    driver.documents.isVerified = allApproved;
    
    // If all approved, automatically set status to active
    if (allApproved) {
      driver.status = 'active';
    }
    
    await driver.save();

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

// --- ADDITIONAL SERVICES API ---

// Get all additional services (with seeding)
router.get('/admin/additional-services', async (req, res) => {
  try {
    let services = await AdditionalService.find();
    if (services.length === 0) {
      const defaultServices = [
        { name: 'Дугуй тавих', price: 30000 },
        { name: 'Гараж руу оруулах', price: 50000 }
      ];
      services = await AdditionalService.insertMany(defaultServices);
    }
    res.json(services);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add additional service
router.post('/admin/additional-services', async (req, res) => {
  try {
    const service = new AdditionalService(req.body);
    await service.save();
    res.json(service);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update additional service
router.put('/admin/additional-services/:id', async (req, res) => {
  try {
    const service = await AdditionalService.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(service);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete additional service
router.delete('/admin/additional-services/:id', async (req, res) => {
  try {
    await AdditionalService.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- CUSTOMER APP ENDPOINTS ---

// Customer Login / OTP Request
router.post('/auth/login', async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ message: 'Phone number is required' });

    let customer = await Customer.findOne({ phone });
    if (!customer) {
      customer = new Customer({ phone, name: phone });
      await customer.save();
    }

    // Generate OTP (Mock: 1234)
    const otp = '1234'; 
    const otpExpiry = new Date(Date.now() + 5 * 60000); // 5 mins

    customer.otp = otp;
    customer.otpExpiry = otpExpiry;
    await customer.save();

    console.log(`[Customer Auth] OTP for ${phone}: ${otp}`);
    res.json({ message: 'OTP sent successfully', dev_otp: otp });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Verify OTP
router.post('/auth/verify-otp', async (req, res) => {
  try {
    const { phone, otp } = req.body;
    const customer = await Customer.findOne({ phone });

    if (!customer) return res.status(404).json({ message: 'Customer not found' });
    if (customer.otp !== otp || customer.otpExpiry < Date.now()) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    // Clear OTP
    customer.otp = undefined;
    customer.otpExpiry = undefined;
    await customer.save();

    res.json({ 
      token: 'mock_jwt_token_' + customer._id, 
      customer 
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get Customer Profile
router.get('/customer/profile', async (req, res) => {
  try {
    const { id } = req.query;
    if (!id) return res.status(400).json({ message: 'Customer ID required' });

    const customer = await Customer.findById(id);
    if (!customer) return res.status(404).json({ message: 'Customer not found' });
    
    res.json(customer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Request Ride
router.post('/rides/request', async (req, res) => {
  try {
    const { customerId, pickup, dropoff, vehicleType, distance } = req.body;
    
    // Calculate Price
    let price = 0;
    let pricingRule = await Pricing.findOne({ vehicleType });
    
    if (pricingRule && distance) {
        let dist = Number(distance);
        price = pricingRule.basePrice;
        if (dist > 4) {
             price += (dist - 4) * pricingRule.pricePerKm;
        }
    } else {
        // Fallback based on serviceType/vehicleType
        const dist = Number(distance) || 0;
        const type = req.body.serviceType || vehicleType || 'Tow';
        
        if (type === 'Ride' || type === 'Sedan') {
            price = 1000 + dist * 1500;
        } else if (type === 'Cargo') {
            price = 5000 + dist * 2000;
        } else {
            // Towing default
            price = 80000 + dist * 2000; 
        }
    }
    
    price = Math.ceil(price / 100) * 100;

    const tripData = {
      pickupLocation: pickup,
      dropoffLocation: dropoff,
      vehicleModel: vehicleType,
      serviceType: req.body.serviceType || 'Tow', // Default to Tow if not specified
      distance: Number(distance),
      price,
      status: 'payment_pending', // Changed from pending
      paymentStatus: 'pending',
      createdAt: new Date()
    };

    // Prepayment Logic (TEMPORARILY DISABLED)
    const prepaymentPercentage = 0;
    const prepaymentAmount = 0;
    tripData.prepaymentAmount = prepaymentAmount;
    tripData.remainingAmount = price;
    tripData.status = 'pending';
    tripData.paymentStatus = 'pending';

    if (customerId && customerId !== 'guest') {
        tripData.customer = customerId;
        const customerObj = await Customer.findById(customerId);
        if (customerObj) {
            tripData.customerName = customerObj.name;
            tripData.customerPhone = customerObj.phone;
        }
    }

    const trip = new Trip(tripData);

    await trip.save();
    
    // Broadcast logic (Copied from confirm-payment)
    const io = req.app.get('io');
    const driverLocations = req.app.driverLocations || {};
    const pickupLat = trip.pickupLocation.lat;
    const pickupLng = trip.pickupLocation.lng;
    let matchedDrivers = 0;
    const nearbyDriverIds = [];

    console.log(`[Trip Request /rides/request] Finding drivers near ${pickupLat}, ${pickupLng} within 10km...`);
    console.log(`[Debug] ServiceType: ${trip.serviceType}, Active Drivers: ${Object.keys(driverLocations).length}`);

    // 1. Identify drivers within range
    Object.keys(driverLocations).forEach(driverId => {
      const loc = driverLocations[driverId];
      if (loc && (loc.latitude || loc.lat) && (loc.longitude || loc.lng)) {
         const dLat = loc.latitude || loc.lat;
         const dLng = loc.longitude || loc.lng;
         
         const dist = getDistance(pickupLat, pickupLng, dLat, dLng);
         console.log(`[Debug] Driver ${driverId} distance: ${dist.toFixed(2)}km`);
         
         if (dist <= 10) { // Increased to 10km for easier testing
            nearbyDriverIds.push(driverId);
         }
      }
    });

    // 2. Filter drivers by Vehicle Type and Dispatch
    if (nearbyDriverIds.length > 0) {
        try {
            const drivers = await Driver.find({ _id: { $in: nearbyDriverIds } });
            
            drivers.forEach(driver => {
                const vehicleType = driver.vehicleType || 'Ride';
                const role = driver.role || 'taxi'; // Support role-based dispatch
                let isCompatible = false;

                // Enhanced matching logic
                if (trip.serviceType === 'Tow' || trip.serviceType === 'sos') {
                    // SOS requests should go to Tow drivers, SOS drivers, and anyone with 'tow' role
                    isCompatible = (vehicleType === 'Tow' || vehicleType === 'SOS' || vehicleType === 'sos' || role === 'tow');
                } else if (trip.serviceType === 'delivery') {
                    isCompatible = (vehicleType === 'Cargo' || vehicleType === 'Delivery' || role === 'delivery');
                } else {
                    // Taxi/Ride
                    isCompatible = (vehicleType === 'Ride' || vehicleType === 'Taxi' || vehicleType === 'Sedan' || role === 'taxi');
                }

                if (isCompatible) {
                    console.log(` -> Match: Driver ${driver._id} (${vehicleType}/${role}) is compatible.`);
                    io.to(`driver_${driver._id}`).emit('newJobRequest', trip);
                    matchedDrivers++;

                    if (driver.pushToken) {
                        sendPushNotification(
                            driver.pushToken, 
                            "🔔 Шинэ дуудлага!", 
                            `${trip.pickupLocation?.address || 'Хаяг тодорхойгүй'} -> ${trip.dropoffLocation?.address || 'Хаяг тодорхойгүй'}`,
                            { tripId: trip._id }
                        );
                    }
                } else {
                    console.log(` -> Skip: Driver ${driver._id} (${vehicleType}/${role}) not compatible with ${trip.serviceType}`);
                }
            });
        } catch (err) {
            console.error("Error filtering drivers by role:", err);
        }
    } else {
        console.log("[Debug] No drivers found within range.");
    }

    // Always notify admin
    io.to('admin_room').emit('newJobRequest', trip);

    res.json({
      ...trip.toObject(),
      requiresPayment: false,
      prepaymentAmount
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Ride History
router.get('/rides/history', async (req, res) => {
  try {
    const { customerId } = req.query;
    if (!customerId) return res.status(400).json({ message: 'Customer ID required' });

    const trips = await Trip.find({ customer: customerId }).sort({ createdAt: -1 });
    res.json(trips);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get Active Ride
router.get('/rides/active', async (req, res) => {
  try {
    const { customerId } = req.query;
    if (!customerId) return res.status(400).json({ message: 'Customer ID required' });

    const trip = await Trip.findOne({ 
      customer: customerId, 
      status: { $in: ['pending', 'accepted', 'in_progress'] } 
    }).populate('driver'); 
    
    if (!trip) return res.status(404).json({ message: 'No active trip' });
    
    res.json(trip);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Pricing Rules Routes
router.get('/admin/pricing', async (req, res) => {
  if (isOffline()) {
    return res.json([
      { vehicleType: 'Taxi', basePrice: 1000, pricePerKm: 1500, isActive: true },
      { vehicleType: 'Delivery', basePrice: 5000, pricePerKm: 2000, isActive: true },
      { vehicleType: 'SOS', basePrice: 2000, pricePerKm: 2000, isActive: true },
      { vehicleType: 'Driver', basePrice: 3000, pricePerKm: 2500, isActive: true },
      { vehicleType: 'Tow', basePrice: 80000, pricePerKm: 10000, isActive: true },
      { vehicleType: 'Luxury', basePrice: 10000, pricePerKm: 5000, isActive: true }
    ]);
  }

  try {
    const pricing = await Pricing.find({ isActive: true }).sort({ order: 1 });
    if (pricing.length === 0) {
      // Seed default if empty
      const defaults = [
        { vehicleType: 'Taxi', basePrice: 1000, pricePerKm: 1500, order: 1 },
        { vehicleType: 'Delivery', basePrice: 5000, pricePerKm: 2000, order: 2 },
        { vehicleType: 'SOS', basePrice: 2000, pricePerKm: 2000, order: 3 },
        { vehicleType: 'Driver', basePrice: 3000, pricePerKm: 2500, order: 4 },
        { vehicleType: 'Tow', basePrice: 80000, pricePerKm: 10000, order: 5 },
        { vehicleType: 'Luxury', basePrice: 10000, pricePerKm: 5000, order: 6 }
      ];
      await Pricing.insertMany(defaults);
      return res.json(defaults);
    }
    res.json(pricing);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Calculate Price Endpoint
router.post('/pricing/calculate', async (req, res) => {
  const { distance, vehicleType } = req.body;
  try {
    let pricingRule = await Pricing.findOne({ vehicleType: vehicleType });
    if (!pricingRule) {
      // Fallback defaults
      if (vehicleType === 'Taxi') pricingRule = { basePrice: 1000, pricePerKm: 1500 };
      else if (vehicleType === 'Delivery') pricingRule = { basePrice: 5000, pricePerKm: 2000 };
      else if (vehicleType === 'SOS') pricingRule = { basePrice: 2000, pricePerKm: 2000 };
      else if (vehicleType === 'Tow') pricingRule = { basePrice: 80000, pricePerKm: 10000 };
      else pricingRule = { basePrice: 2000, pricePerKm: 2000 };
    }

    const dist = Number(distance);
    let price = pricingRule.basePrice;
    if (dist > 4) {
      price += (dist - 4) * pricingRule.pricePerKm;
    }
    
    // Round to nearest 100
    price = Math.ceil(price / 100) * 100;

    res.json({ price, currency: '₮' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
