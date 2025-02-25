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
  },
  phone: {
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
  totalReviews:{
    type: Number,
    default: 0,
  },
  isVehicle:{
    type: Boolean,
    default: false,
  },
  isRiding:{
    type: Boolean,
    default: false,
  },
  rating:{
    type: Number,
    default: 0,
  },
  amount:{
    type: Number,
    default: 0,
  },
  points:{
    type: Number,
    default: 0,
  },
  address:String,
  image:String,
  fcmtoken: String,
  dob: String,
  referral_code: {
    type: String,
    required: true,
    minlength: 5,
    maxlength: 255,
    unique: true,
  },
  account_info:{
    account_name: String,
    account_number:String,
    account_mobile_id:String,
    jad_username:String,
  },
  gender: String,
  cus_id:String,
  insurancetype:String,
  insurance:String,
  police_record:String,
  docs:[String],
  ride_type: {
    type: String,
    default: 'ride',
    enum: ['ride', 'parcel', "both"]
  },
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
    enum: ['online',"offline", 'deleted', "deactivated"]
  },
  type: {
    type: String,
    default: 'customer',
    enum: ['customer',"rider",'admin']
  },
  login_type: {
    type: String,
    default: 'email',
    enum: ['email', 'social-login']
  },
  homeAddress:{
    address:String,
    lat:String,
    lng:String,
  },
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Like'}],
  vehicle: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle'},
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
    code: Joi.string().min(0).max(1024).optional(),
    dob: Joi.string().min(0).max(1024).optional(),
    phone: Joi.string().min(0).max(1024).required(),
    gender: Joi.string().min(0).max(1024).optional(),
    referral: Joi.string().min(0).max(1024).optional(),
    image: Joi.string().min(0).max(1024).optional(),
    insurancetype: Joi.string().min(0).max(1024).optional(),
    ride_type: Joi.string().min(0).max(1024).optional(),
    address: Joi.string().min(0).max(1024).optional(),
    insurance: Joi.string().min(0).max(1024).optional(),
    police_record: Joi.string().min(0).max(1024).optional(),
    lat: Joi.number().optional(),
    lng: Joi.number().optional(),
    docs: Joi.array().min(0).max(1024).optional(),
    account_info: Joi.object().optional(),
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
    email:Joi.string().min(5).max(255).email(),
    type: Joi.string().min(2).max(50).required(),
  })

  return schema.validate(body);
}
function phoneApiBodyValidate(body) {
  const schema = Joi.object({
    phone: Joi.string().min(4).max(50).required(),
  })

  return schema.validate(body);
}

function emailBodyValidate(body) {
  const schema = Joi.object({
    email: Joi.string().min(5).max(255).email(),
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
exports.emailBodyValidate = emailBodyValidate;