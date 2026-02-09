require('dotenv').config();
const axios = require('axios');

async function testPushNotification() {
    console.log('Testing OneSignal Push Notification...');
    
    // Check credentials
    if (!process.env.ONESIGNAL_APP_ID || !process.env.ONESIGNAL_REST_API_KEY) {
        console.error('❌ Missing OneSignal credentials in .env');
        return;
    }

    // Payload
    const notification = {
        app_id: process.env.ONESIGNAL_APP_ID,
        headings: { en: "Test Notification" },
        contents: { en: "This is a test message from Khan Motors Backend script." },
        included_segments: ["Total Subscriptions"] // Sends to ALL users
    };

    console.log('Sending notification with config:', {
        app_id: process.env.ONESIGNAL_APP_ID,
        target: 'All Subscribed Users (Test Mode)'
    });

    try {
        const response = await axios.post('https://onesignal.com/api/v1/notifications', notification, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Basic ${process.env.ONESIGNAL_REST_API_KEY}`
            }
        });

        console.log('✅ Notification Sent Successfully!');
        console.log('Full Response Data:', JSON.stringify(response.data, null, 2));
    } catch (error) {
        console.error('❌ Error sending notification:');
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', JSON.stringify(error.response.data, null, 2));
        } else {
            console.error(error.message);
        }
    }
}

testPushNotification();
