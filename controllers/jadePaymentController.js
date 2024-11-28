const axios = require('axios');
const querystring = require('querystring');
const { User } = require('../models/user')
const CryptoJS = require('crypto-js');
const config = require('config');

// Configuration
const apiKey = 'W37LQ.1656598462';
const apiSecret = 'CD6EC7536CE85FFB2A2342C9904DBC97B50EB337D6868AAE7D92F5D575B27DE3';
const tokenUrl = 'https://jad.cash/HAPI/token';
const paymentUrl = 'https://jad.cash/HAPI/cardpayment';

// // Function to get token
// async function getToken() {
//   try {
//     const response = await axios.get(`${tokenUrl}?apikey=${apiKey}&secret=${apiSecret}&grant_type=credentials`);
//     return response.data;
//   } catch (error) {
//     throw error;
//   }
// }

async function getToken() {
  const url = `${tokenUrl}`;
  const params = new URLSearchParams({
    apikey: apiKey,
    secret: apiSecret,
    grant_type: 'credentials'
  });

  try {
    const response = await fetch(`${url}?${params.toString()}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
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
    return response.data;
  } catch (error) {
    throw error;
  }
}

exports.create = async (req, res) => {
  try {
    // Get token
    // const userId = req.user._id
    // const user = await User.findOne({ _id: userId })
    // if (!user) {
    //   return res.status(404).json({ success: false, message: 'User not found!' })
    // }
    const { payment } = req.body;

    // if (!paymentData) {
    //   return res.status(404).json({ success: false, message: 'Payment Data is required' })
    // }
    // // Decrypt the paymentData
    // const bytes = CryptoJS.AES.decrypt(paymentData, config.get('cryptoPrivateKey'));
    // const decryptedData = bytes.toString(CryptoJS.enc.Utf8);
    // if (!decryptedData) {
    //   return res.status(404).json({ success: false, message: 'Payment Data is required' })
    // }
    // const payment = JSON.parse(decryptedData)
    // const requiredFields = [
    //   'amount', 'cardnumber', 'cardexpmonth', 'cardexpyear', 'cardcvv',
    //   'cardfirstname', 'cardlastname', 'address', 'city', 'state',
    //   'postalcode', 'country', 'email', 'phone'
    // ];

    // const missingFields = requiredFields.filter(field => !payment[field]);

    // if (missingFields.length > 0) {
    //   return res.status(400).json({
    //     success: false,
    //     message: `Missing required fields: ${missingFields.join(', ')}`
    //   });
    // }
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
      amount: payment.amount,
      cardnumber: payment.cardnumber,
      cardexpmonth: payment.cardexpmonth,
      cardexpyear: payment.cardexpyear,
      cardcvv: payment.cardcvv,
      cardfirstname: payment.cardfirstname,
      cardlastname: payment.cardlastname,
      address: payment.address,
      city: payment.city,
      state: payment.state,
      postalcode: payment.postalcode,
      country: payment.country,
      email: payment.email,
      phone: payment.phone
    };

    // Submit payment
    const paymentResponse = await submitPayment(token, paydata);
    res.status(201).json({ success: true, response: paymentResponse });
  } catch (error) {
    console.log(error)
    res.status(500).json({ success: false, message: 'Internal server error', error: error });
  }
};
