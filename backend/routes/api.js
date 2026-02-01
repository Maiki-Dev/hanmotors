const express = require('express');
const router = express.Router();
const Driver = require('../models/Driver');
const Trip = require('../models/Trip');

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

// Helper to check offline mode
const isOffline = () => false; // FORCE ONLINE MODE (Disable Mock Data)

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
    const activeDrivers = await Driver.countDocuments({ status: 'active' });
    const onlineDrivers = await Driver.countDocuments({ isOnline: true });
    const today = new Date();
    today.setHours(0,0,0,0);
    const todayRequests = await Trip.countDocuments({ createdAt: { $gte: today } });
    const allTrips = await Trip.find({ status: 'completed' });
    const totalRevenue = allTrips.reduce((acc, trip) => acc + trip.price, 0);

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
    const trip = new Trip(req.body);
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
    const trip = await Trip.findByIdAndUpdate(req.params.id, { 
      status: 'accepted',
      driver: driverId
    }, { new: true });
    
    const io = req.app.get('io');
    io.emit('driverAccepted', { tripId: trip._id, driverId });
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
    const trip = await Trip.findByIdAndUpdate(req.params.id, { 
      status: 'completed',
      endTime: new Date()
    }, { new: true });
    
    // Update driver earnings
    if (trip.driver) {
      await Driver.findByIdAndUpdate(trip.driver, {
        $inc: {
          'earnings.total': trip.price,
          'earnings.daily': trip.price,
          'earnings.weekly': trip.price
        }
      });
    }

    const io = req.app.get('io');
    io.emit('tripCompleted', { tripId: trip._id });
    res.json(trip);
  } catch (err) {
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
    const drivers = await Driver.find({ 'wallet.transactions': { $exists: true, $not: { $size: 0 } } });
    
    let allTransactions = [];
    let totalWalletCredits = 0; // Money entering system via wallet recharge
    let totalWalletDebits = 0;  // Money leaving wallet

    drivers.forEach(driver => {
      if (driver.wallet && driver.wallet.transactions) {
        driver.wallet.transactions.forEach(tx => {
          allTransactions.push({
            id: tx._id,
            driver: driver.name,
            driverId: driver._id,
            email: driver.email, // Added email
            amount: tx.amount,
            type: tx.type, // 'credit' or 'debit'
            description: tx.description,
            date: tx.date,
            method: 'Wallet', // or parse from description
            status: 'completed' // Wallet transactions are immediate
          });

          if (tx.type === 'credit') totalWalletCredits += tx.amount;
          if (tx.type === 'debit') totalWalletDebits += tx.amount;
        });
      }
    });

    // Sort by date desc
    allTransactions.sort((a, b) => new Date(b.date) - new Date(a.date));

    // Get Total Revenue from Trips (Platform Revenue)
    // Assuming revenue is the total price of all completed trips for now
    // Or if we implement commission, it would be commission.
    const completedTrips = await Trip.find({ status: 'completed' });
    const totalTripRevenue = completedTrips.reduce((acc, trip) => acc + (trip.price || 0), 0);

    res.json({
      stats: {
        totalRevenue: totalTripRevenue, // Total value of trips
        totalWalletDeposits: totalWalletCredits, // Total money loaded into wallets
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

module.exports = router;
