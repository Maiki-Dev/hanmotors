const mongoose = require('mongoose');
const Driver = require('./models/Driver');

// Connect to MongoDB
mongoose.connect('mongodb://127.0.0.1:27017/xanmotors', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('MongoDB Connected'))
.catch(err => console.error(err));

async function reproduce() {
  try {
    // 1. Create a test driver
    const testDriver = new Driver({
      name: 'Test Repro',
      phone: '99990000',
      email: 'test@test.com',
      password: 'pass',
      wallet: {
        balance: 0,
        transactions: []
      }
    });
    await testDriver.save();
    console.log('Created test driver:', testDriver._id);

    // 2. Add Credit (Top-up)
    testDriver.wallet.balance += 20000;
    testDriver.wallet.transactions.push({
      type: 'credit',
      amount: 20000,
      description: 'Top-up 20k',
      date: new Date()
    });
    await testDriver.save();
    console.log('Added 20k credit.');

    // 3. Calculate Stats (Simulate API logic)
    let stats1 = await calculateStats();
    console.log('Stats after credit:', stats1);

    // 4. Add Debit (Commission)
    testDriver.wallet.balance -= 2000;
    testDriver.wallet.transactions.push({
      type: 'debit',
      amount: 2000,
      description: 'Commission 2k',
      date: new Date()
    });
    await testDriver.save();
    console.log('Added 2k debit.');

    // 5. Calculate Stats again
    let stats2 = await calculateStats();
    console.log('Stats after debit:', stats2);

    if (stats1.totalWalletDeposits === stats2.totalWalletDeposits) {
      console.log('SUCCESS: Total Wallet Top-ups did NOT change.');
    } else {
      console.log('FAILURE: Total Wallet Top-ups CHANGED!');
    }

    // Cleanup
    await Driver.findByIdAndDelete(testDriver._id);

  } catch (err) {
    console.error(err);
  } finally {
    mongoose.connection.close();
  }
}

async function calculateStats() {
  const drivers = await Driver.find({ 'wallet.transactions': { $exists: true, $not: { $size: 0 } } });
  let totalWalletCredits = 0;
  
  drivers.forEach(driver => {
    if (driver.wallet && driver.wallet.transactions) {
      driver.wallet.transactions.forEach(tx => {
        if (tx.type === 'credit') totalWalletCredits += tx.amount;
      });
    }
  });
  
  return { totalWalletDeposits: totalWalletCredits };
}

reproduce();
