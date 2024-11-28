const axios = require('axios');
const querystring = require('querystring');

// Configuration
const apiKey = 'W37LQ.1656598462';
const apiSecret = 'CD6EC7536CE85FFB2A2342C9904DBC97B50EB337D6868AAE7D92F5D575B27DE3';
const tokenUrl = 'https://jad.cash/HAPI/token';
const paymentUrl = 'https://jad.cash/HAPI/cardpayment';

// Function to get token
async function getToken() {
    try {
        const response = await axios.get(`${tokenUrl}?apikey=${apiKey}&secret=${apiSecret}&grant_type=credentials`);
        console.log('Token Response:', JSON.stringify(response.data));
        return response.data;
    } catch (error) {
        console.error('Error getting token:', error.response ? error.response.data : error.message);
        throw error;
    }
}

// Function to submit payment
async function submitPayment(token, paydata) {
    try {
        const postData = querystring.stringify({
            token: token,
            paydata: JSON.stringify(paydata)
        });

        const response = await axios.post(paymentUrl, postData, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': Buffer.byteLength(postData)
            }
        });

        console.log('Payment Response:', JSON.stringify(response.data));
        return response.data;
    } catch (error) {
        console.error('Error submitting payment:', error.response ? error.response.data : error.message);
        throw error;
    }
}

// Main function to process payment
async function processPayment() {
    try {
        // Get token
        const tokenResponse = await getToken();
        
        if (tokenResponse.result !== 'Success') {
            throw new Error(`Failed to obtain token: ${JSON.stringify(tokenResponse)}`);
        }

        const token = tokenResponse.data.token;

        // Prepare payment data
        const paydata = {
            live: '0',
            timestamp: new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14),
            refnum: '101',
            jadnumber: '101265538929',
            amount: '2.50',
            cardnumber: '4111111111111111',
            cardexpmonth: '12',
            cardexpyear: '2025',
            cardcvv: '123',
            cardfirstname: 'jon',
            cardlastname: 'snow',
            address: '123 Cayon St',
            city: 'Basseterre',
            state: 'St. Kitts',
            postalcode: 'KN0869',
            country: 'Saint Kitts and Nevis',
            email: 'jon@snow.net',
            phone: '2025555555'
        };

        console.log('Payment Payload:', JSON.stringify({ token, paydata }));

        // Submit payment
        const paymentResponse = await submitPayment(token, paydata);
        
        return paymentResponse;
    } catch (error) {
        console.error('Payment processing failed:', error.message);
        return { error: error.message };
    }
}

// Run the payment process
processPayment().then(result => {
    console.log('Final Result:', JSON.stringify(result));
}).catch(error => {
    console.error('Unhandled error:', error);
});