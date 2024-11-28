const express = require('express');
const error = require('../middleware/error');
const auth = require('../routes/auth');
const users = require('../routes/users');
const uploadImages = require('../routes/uploadImages');
const postRoutes = require('../routes/postRoutes');
const categoryRoute = require('../routes/categoryRoute');
const couponRoute = require('../routes/couponRoute');
const jadeRoutes = require('../routes/jadePaymentRoutes');
const resellRoutes = require('../routes/resellRoutes');
const messageRoutes = require('../routes/messageRoutes');
const notificationRoute = require('../routes/notificationRoute');
const walletRoute = require('../routes/walletRoute');
const authMiddleware = require('../middleware/auth');
const BannerRoute = require('../routes/BannerRoute');

module.exports = function (app) {
  app.use(express.json());
  app.use('/api/auth', auth);
  app.use('/api/users', users);
  app.use('/api/image', uploadImages);
  app.use('/api/category', categoryRoute);
  app.use('/api/banner', BannerRoute);
  app.use('/api/coupon', couponRoute);
  app.use('/api/event',  postRoutes);
  app.use('/api/jade',  jadeRoutes);
  app.use('/api/resell',resellRoutes);
  // app.use('/api/food', authMiddleware,foodRoutes);
  app.use('/api/msg',authMiddleware, messageRoutes);
  app.use('/api/notification',authMiddleware, notificationRoute);
  app.use('/api/wallet',authMiddleware, walletRoute);
  // app.use('/api/support', supportRoute);
  app.use(error);
}