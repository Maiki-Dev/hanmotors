const Pricing = require('../models/Pricing');
const AdditionalService = require('../models/AdditionalService');

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

const seedData = async () => {
    try {
        const pricingCount = await Pricing.countDocuments();
        if (pricingCount === 0) {
            console.log('🌱 Seeding Default Pricing Rules...');
            await Pricing.insertMany(defaultRules);
            console.log('✅ Pricing Rules Seeded');
        }

        const serviceCount = await AdditionalService.countDocuments();
        if (serviceCount === 0) {
            console.log('🌱 Seeding Default Additional Services...');
            await AdditionalService.insertMany(defaultServices);
            console.log('✅ Additional Services Seeded');
        }
    } catch (error) {
        console.error('❌ Seeding Error:', error);
    }
};

module.exports = seedData;
