const jwt = require('jsonwebtoken');
const config = require('config');

module.exports = function (req, res, next) {
  const token = req.header('x-auth-token');
  // if (!token) return res.status(401).send('Access denied. No token provided.');

  try {
    if (token) {
      const decoded = jwt.verify(token, config.get('jwtPrivateKey'));//JWT need to be defined somewherelese
      req.user = decoded;
    }
    next();
  }
  catch (ex) {
    res.status(400).send({message:'Invalid token.'});
  }
}