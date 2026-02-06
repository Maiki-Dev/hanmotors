const mongoose = require('mongoose');
const Pricing = require('./models/Pricing');
const AdditionalService = require('./models/AdditionalService');
require('dotenv').config();

// Use localhost for running script from host machine
const MONGO_URI = 'mongodb://127.0.0.1:27017/khanmotors';

const defaultRules = [
    { vehicleType: 'Суудлын машин (Дунд SUV)', basePrice: 80000, pricePerKm: 10000, order: 1 },
    { vehicleType: 'Том SUV / Pickup', basePrice: 100000, pricePerKm: 15000, order: 2 },
    { vehicleType: 'Micro автобус / Porter / Bongo', basePrice: 120000, pricePerKm: 20000, order: 3 },
    { vehicleType: '5 тонн хүртэл ачааны машин', basePrice: 180000, pricePerKm: 25000, order: 4 },
    { vehicleType: 'Том оврын Truck', basePrice: 250000, pricePerKm: 35000, order: 5 },
    { vehicleType: 'Bobcat техник', basePrice: 220000, pricePerKm: 30000, order: 6 }
];

const defaultServices = [
    { name: 'Дугуй тавих', price: 30000 },
    { name: 'Гараж руу оруулах', price: 50000 }
];

async function restoreData() {
    try {
        console.log(`Connecting to ${MONGO_URI}...`);
        await mongoose.connect(MONGO_URI);
        console.log('✅ Connected to MongoDB');

        // Restore Pricing
        const pricingCount = await Pricing.countDocuments();
        if (pricingCount === 0) {
            await Pricing.insertMany(defaultRules);
            console.log('✅ Restored Default Pricing Rules');
        } else {
            console.log('ℹ️ Pricing Rules already exist. Skipping.');
        }

        // Restore Additional Services
        const serviceCount = await AdditionalService.countDocuments();
        if (serviceCount === 0) {
            await AdditionalService.insertMany(defaultServices);
            console.log('✅ Restored Default Additional Services');
        } else {
            console.log('ℹ️ Additional Services already exist. Skipping.');
        }

    } catch (error) {
        console.error('❌ Error restoring data:', error);
    } finally {
        await mongoose.disconnect();
        process.exit();
    }
}

restoreData();
