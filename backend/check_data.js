const mongoose = require('mongoose');
const Driver = require('./models/Driver');
const Trip = require('./models/Trip');
const Customer = require('./models/Customer');
require('dotenv').config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/khanmotors';

async function checkData() {
    try {
        console.log(`Connecting to ${MONGO_URI}...`);
        await mongoose.connect(MONGO_URI);
        console.log('✅ Connected to MongoDB');

        const driverCount = await Driver.countDocuments();
        const tripCount = await Trip.countDocuments();
        const customerCount = await Customer.countDocuments();

        console.log('\n--- Database Status ---');
        console.log(`Drivers: ${driverCount}`);
        console.log(`Trips: ${tripCount}`);
        console.log(`Customers: ${customerCount}`);

        if (driverCount > 0) {
            console.log('\nSample Driver:');
            const driver = await Driver.findOne().select('name phone email wallet status');
            console.log(driver);
        }

        if (tripCount > 0) {
            console.log('\nSample Trip:');
            const trip = await Trip.findOne().select('pickup dropoff price status driverId');
            console.log(trip);
        }

    } catch (error) {
        console.error('Error checking database:', error);
    } finally {
        await mongoose.disconnect();
        process.exit();
    }
}

checkData();
