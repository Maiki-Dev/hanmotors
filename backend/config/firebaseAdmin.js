const admin = require('firebase-admin');
const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT 
  ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT) 
  : null;

if (serviceAccount) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
  console.log('✅ Firebase Admin initialized');
} else {
  console.warn('⚠️ Firebase Service Account not found. Firebase Auth verification will be skipped/mocked.');
}

module.exports = admin;
