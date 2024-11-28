const jwt = require('jsonwebtoken');
const config = require('config');
const { User } = require('../models/user');

module.exports =async function (req, res, next) {
  const token = req.header('x-auth-token');
  if (!token) return res.status(401).send({message:'Access denied. No token provided.'});

  try {
    const decoded = jwt.verify(token, config.get('jwtPrivateKey'));//JWT need to be defined somewherelese
    const user = await User.findById(decoded._id).select('status');

    if (user.status=='online') {
      req.user = decoded;
      next();
    }else{
     return res.status(440).send({"message":'User has been deactivated. Contact admin for further support.'});
    }
  }
  catch (ex) {
    res.status(400).send({message:'Invalid token.'});
  }
}