const axios = require('axios');

class QPayService {
  constructor() {
    this.baseUrl = 'https://merchant.qpay.mn/v2';
    this.username = process.env.QPAY_USERNAME || 'YOUR_USERNAME';
    this.password = process.env.QPAY_PASSWORD || 'YOUR_PASSWORD';
    this.invoiceCode = process.env.QPAY_INVOICE_CODE || 'KHAN_MOTORS_INVOICE';
    this.token = null;
    this.tokenExpiresAt = 0;
  }

  async authenticate() {
    // Check if token is valid (User requirement: Tokenий хугацаа нь timestamp ба тухайн хугацаанд нэг л удаа авдаг)
    if (this.token && Date.now() < this.tokenExpiresAt) {
      return this.token;
    }

    try {
      console.log('Refreshing QPay Token...');
      const auth = Buffer.from(`${this.username}:${this.password}`).toString('base64');
      const response = await axios.post(`${this.baseUrl}/auth/token`, {}, {
        headers: {
          'Authorization': `Basic ${auth}`
        }
      });

      if (response.data && response.data.access_token) {
        this.token = response.data.access_token;
        // Token usually lasts 24h (86400s). 
        // We set expiry slightly before the actual expiry to be safe.
        // response.data.expires_in is in seconds.
        const expiresIn = response.data.expires_in || 86400;
        this.tokenExpiresAt = Date.now() + (expiresIn * 1000) - 60000; 
        console.log(`QPay Token Refreshed. Expires at: ${new Date(this.tokenExpiresAt).toISOString()}`);
        return this.token;
      } else {
        throw new Error('Failed to obtain access token');
      }
    } catch (error) {
      console.error('QPay Authentication Error:', error.response?.data || error.message);
      throw error;
    }
  }

  async createInvoice(amount, description = 'Wallet Topup', driverData = null) {
    try {
      const token = await this.authenticate();
      
      const payload = {
        invoice_code: this.invoiceCode,
        sender_invoice_no: `Цэнэглэлт-${Date.now()}`,
        invoice_receiver_code: '83', 
        sender_branch_code: 'CENTRAL',
        invoice_description: description,
        enable_expiry: "false",
        allow_partial: false,
        minimum_amount: null,
        allow_exceed: false,
        maximum_amount: null,
        amount: Number(amount),
        callback_url: `${process.env.API_URL || 'https://khanmotors.cloud'}/api/payment/qpay/callback`,
        sender_staff_code: 'online',
        note: null,
        invoice_receiver_data: driverData ? {
             register: driverData.register || "00000000",
             name: driverData.name || "Driver",
             email: driverData.email || "driver@hanmotors.mn",
             phone: driverData.phone || "99999999"
        } : undefined,
        lines: [
            {
                tax_product_code: "6401",
                line_description: description,
                line_quantity: "1.00",
                line_unit_price: Number(amount).toFixed(2),
                note: description,
                discounts: [],
                surcharges: [],
                taxes: []
            }
        ]
      };

      const response = await axios.post(`${this.baseUrl}/invoice`, payload, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      return response.data;
    } catch (error) {
      console.error('QPay Create Invoice Error:', error.response?.data || error.message);
      throw error;
    }
  }

  async checkPayment(invoiceId) {
    try {
      const token = await this.authenticate();
      
      const payload = {
        object_type: "INVOICE",
        object_id: invoiceId,
        offset: {
          page_number: 1,
          page_limit: 100
        }
      };

      const response = await axios.post(`${this.baseUrl}/payment/check`, payload, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      return response.data;
    } catch (error) {
      console.error('QPay Check Payment Error:', error.response?.data || error.message);
      throw error;
    }
  }
}

module.exports = new QPayService();
