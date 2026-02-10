const fs = require('fs');
const path = require('path');

try {
    const keyPath = path.join(__dirname, 'firebase-key.json');
    
    if (!fs.existsSync(keyPath)) {
        console.error('\n❌ Алдаа: "firebase-key.json" файл олдсонгүй!');
        console.log('1. Firebase Console -> Project Settings -> Service Accounts -> Generate new private key');
        console.log('2. Татаж авсан файлаа энэ хавтас руу "firebase-key.json" нэртэйгээр хуулна уу.');
        process.exit(1);
    }

    const keyContent = fs.readFileSync(keyPath, 'utf8');
    // Remove newlines and escape double quotes if necessary (though single quotes wrap handles it mostly)
    // The safest way for .env is single quotes wrapping the minified JSON
    const minified = JSON.stringify(JSON.parse(keyContent));
    
    console.log('\n✅ VPS-ийн .env файлд хуулах мөр:\n');
    console.log(`FIREBASE_SERVICE_ACCOUNT='${minified}'`);
    console.log('\n☝️ Дээрх мөрийг бүгдийг нь хуулж авна уу.');

} catch (error) {
    console.error('Алдаа гарлаа:', error.message);
}
