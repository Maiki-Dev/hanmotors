const mongoose = require('mongoose');
require('dotenv').config();

const MONGO_URI = process.env.MONGO_URI;

async function resetDB() {
    if (!MONGO_URI) {
        console.error('❌ MONGO_URI is missing in .env');
        process.exit(1);
    }

    try {
        console.log(`Connecting to ${MONGO_URI}...`);
        await mongoose.connect(MONGO_URI);
        console.log('✅ Connected to MongoDB.');

        console.log('\n--- RESETTING DATA ---');

        // 1. Drivers
        const d = await mongoose.connection.collection('drivers').deleteMany({});
        console.log(`🗑️ Deleted ${d.deletedCount} drivers.`);

        // 2. Customers
        const c = await mongoose.connection.collection('customers').deleteMany({});
        console.log(`🗑️ Deleted ${c.deletedCount} customers.`);

        // 3. Trips
        const t = await mongoose.connection.collection('trips').deleteMany({});
        console.log(`🗑️ Deleted ${t.deletedCount} trips.`);

        console.log('\n✅ Database Reset Successfully!');
        console.log('Note: Pricing and Additional Services configurations were PRESERVED (not deleted).');

    } catch (error) {
        console.error('❌ Error resetting database:', error);
    } finally {
        await mongoose.disconnect();
        process.exit();
    }
}

resetDB();
