const { User } = require('../models/user');
const stripe = require('stripe')('sk_test_51Mnq3dKfQh4EQ5pOsXunvI7L9UGOVkKB9QWHpHHaKC6Xt9Exer5lzjx8ukCX6ZojSsoJLjEGDvgOIZhOMXT65MHj00Hvf7Z7eE')

const redirectUrl="http://88.223.92.251:3000/api/payment/redirect/callback";

exports.create = async (req, res) => {
  const userid = req.user._id
  const { amount,accountId } = req.body
  try {
    const user = await User.findById(userid)
    let cus_id = ""

    if (!user) return res.status(200).send({ success: false, message: 'User does not exist' });

    if (!user.cus_id) {
      const customer = await stripe.customers.create();
      cus_id = customer.id
      user.cus_id=cus_id
      await user.save()
    } else {
      cus_id = user.cus_id
    }
    const ephemeralKey = await stripe.ephemeralKeys.create(
      { customer: cus_id },
      { apiVersion: '2023-10-16' }
    );

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Number(amount)*100,
      currency: 'usd',
      customer: cus_id,
      automatic_payment_methods: {
        enabled: true,
      },
      // application_fee_amount: 123,
    }
    // , {
    //   stripeAccount: '{{CONNECTED_ACCOUNT_ID}}',
    // }
  );
    res.json({
      paymentIntent: paymentIntent.client_secret,
      ephemeralKey: ephemeralKey.secret,
      customer: cus_id,
      paymentId:paymentIntent.id
    })
  } catch (error) {
    console.log(error)
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

exports.saveCardApi = async (req, res) => {
  const userid = req.user._id
  try {
    const user = await User.findById(userid)
    let cus_id = ""

    if (!user) return res.status(200).send({ success: false, message: 'User does not exist' });

    if (!user.cus_id) {
      const customer = await stripe.customers.create();
      cus_id = customer.id
      user.cus_id=cus_id
      await user.save()
    } else {
      cus_id = user.cus_id
    }
    const ephemeralKey = await stripe.ephemeralKeys.create(
      { customer: cus_id },
      { apiVersion: '2023-10-16' }
    );
    const paymentIntent = await stripe.setupIntents.create({
      customer: cus_id,
      automatic_payment_methods: {
        enabled: true,
      },
    });
    res.json({
      paymentIntent: paymentIntent.client_secret,
      ephemeralKey: ephemeralKey.secret,
      customer: cus_id,
    })
  } catch (error) {
    console.log(error)
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

exports.createAccount = async (req, res) => {
  const userid = req.user._id
  try {
    const user = await User.findById(userid)
    let account_id = ""

    if (!user) return res.status(200).send({ success: false, message: 'User does not exist' });

    if (!user.accountId) {
      const account = await stripe.accounts.create({
        type: 'standard',
      });
      account_id = account.id
      user.accountId=account_id
      await user.save()
    } else {
      account_id = user.accountId
    }
    const accountLink = await stripe.accountLinks.create({
      account: account_id,
      refresh_url: redirectUrl,
      return_url: redirectUrl,
      type: 'account_onboarding',
    });

    res.json({
      accountLink
    })
  } catch (error) {
    console.log(error)
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

exports.redirectUrl = async (req, res) => {
    res.json({
      data:req.query,
      pa:req.params
    })
};