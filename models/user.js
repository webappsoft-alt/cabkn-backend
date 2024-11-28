const jwt = require('jsonwebtoken');
const Joi = require('joi');
const config = require('config');
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    minlength: 0,
    maxlength: 1024,
  },
  email: {
    type: String,
    required: true,
    minlength: 5,
    maxlength: 255,
    unique: true,
  },
  password: {
    type: String,
    required: true,
    minlength: 3,
    maxlength: 1024,
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
    },
    coordinates: {
      type: [Number],
    },
  },
  address:String,
  interests:[{ type: mongoose.Schema.Types.ObjectId, ref: 'Category' }],
  image:String,
  fcmtoken: String,
  cus_id:String,
  code: {
    type: Number,
    minlength: 0,
    maxlength: 4,
  },
  balance: {
    type: Number,
    default:0
  },
  status: {
    type: String,
    default: 'online',
    enum: ['online', 'deleted', "deactivated"]
  },
  type: {
    type: String,
    default: 'customer',
    enum: ['customer',"owner",'admin']
  },
  login_type: {
    type: String,
    default: 'email',
    enum: ['email', 'social-login']
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
});

userSchema.index({ location: '2dsphere' });


function generateAuthToken(_id,type) {
  const token = jwt.sign({ _id: _id,type:type }, config.get('jwtPrivateKey'));
  return token;
}
function generateIdToken(_id) {
  const expiresIn = 3600; // Token will expire in 1 hour (3600 seconds)
  const token = jwt.sign({ _id: _id }, config.get('jwtIDPrivateKey'), { expiresIn });
  return token;
}


const User = mongoose.model('user', userSchema);

function validateUser(user) {
  const commonSchema = {
    name: Joi.string().min(2).max(50).required(),
    password: Joi.string().min(5).max(255).required(),
    email: Joi.string().min(5).max(255).email(),
    fcmtoken: Joi.string().min(0).max(1024).optional(),
    code: Joi.string().min(0).max(1024).optional()
  };

  const schema = Joi.object({
    ...commonSchema
  });

  return schema.validate(user);
}
function passwordApiBodyValidate(body) {
  const schema = Joi.object({
    password: Joi.string().min(5).max(255).required(),
    token: Joi.string().min(5).max(255).required(),
    code: Joi.string().min(0).max(1024).optional()
  })

  return schema.validate(body);
}

function emailApiBodyValidate(body) {
  const schema = Joi.object({
    email: Joi.string().min(4).max(50).required(),
  })

  return schema.validate(body);
}
function phoneApiBodyValidate(body) {
  const schema = Joi.object({
    phone: Joi.string().min(4).max(50).required(),
  })

  return schema.validate(body);
}

exports.User = User;
exports.validate = validateUser;
exports.generateAuthToken = generateAuthToken;
exports.generateIdToken = generateIdToken;
exports.passwordApiBodyValidate = passwordApiBodyValidate;
exports.emailApiBodyValidate = emailApiBodyValidate;
exports.phoneApiBodyValidate = phoneApiBodyValidate;