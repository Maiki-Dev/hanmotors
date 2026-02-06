require('dotenv').config();
const qpayService = require('./utils/qpay');

async function testQPay() {
    console.log('Testing QPay Integration...');
    console.log('Credentials Check:');
    console.log('Username:', process.env.QPAY_USERNAME ? 'Set' : 'Missing');
    console.log('Password:', process.env.QPAY_PASSWORD ? 'Set' : 'Missing');
    console.log('Invoice Code:', process.env.QPAY_INVOICE_CODE);

    try {
        // 1. Test Create Invoice
        console.log('\n1. Attempting to create Invoice (100 MNT)...');
        const invoice = await qpayService.createInvoice(100, 'Test Local Transaction');
        
        console.log('✅ Invoice Created Successfully!');
        console.log('Invoice ID:', invoice.invoice_id);
        console.log('QR Text:', invoice.qr_text);
        // console.log('QR Image Base64:', invoice.qr_image.substring(0, 50) + '...'); // Truncated

        // 2. Check Payment Status
        if (invoice.invoice_id) {
            console.log('\n2. Checking Payment Status for this new invoice...');
            const status = await qpayService.checkPayment(invoice.invoice_id);
            console.log('✅ Payment Status Check Result:', JSON.stringify(status, null, 2));
        }

    } catch (error) {
        console.error('\n❌ QPay Test Failed:', error.message);
        if (error.response) {
            console.error('API Response Error Data:', JSON.stringify(error.response.data, null, 2));
        }
    }
}

testQPay();
