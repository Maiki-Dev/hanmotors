const mongoose = require('mongoose');
const Driver = require('./models/Driver');
const Trip = require('./models/Trip');

// Connect to MongoDB
mongoose.connect('mongodb://127.0.0.1:27017/xanmotors', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('MongoDB Connected'))
.catch(err => console.error(err));

async function debugWallet() {
  try {
    const drivers = await Driver.find({ 'wallet.transactions': { $exists: true, $not: { $size: 0 } } });
    
    let totalWalletCredits = 0;
    let totalWalletDebits = 0;

    console.log(`Found ${drivers.length} drivers with transactions.`);

    drivers.forEach(driver => {
      console.log(`\nDriver: ${driver.name} (${driver._id})`);
      console.log(`Current Balance: ${driver.wallet.balance}`);
      
      if (driver.wallet && driver.wallet.transactions) {
        driver.wallet.transactions.forEach(tx => {
          console.log(` - [${tx.type}] ${tx.amount} (${tx.description})`);
          
          if (tx.type === 'credit') totalWalletCredits += tx.amount;
          if (tx.type === 'debit') totalWalletDebits += tx.amount;
        });
      }
    });

    console.log('\n--- SUMMARY ---');
    console.log(`Total Wallet Credits (calculated): ${totalWalletCredits}`);
    console.log(`Total Wallet Debits (calculated): ${totalWalletDebits}`);
    console.log(`Net (Credits - Debits): ${totalWalletCredits - totalWalletDebits}`);

  } catch (err) {
    console.error(err);
  } finally {
    mongoose.connection.close();
  }
}

debugWallet();
