const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Doctor = require('../models/Doctor');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');

const signToken = (userId) => {
  if (!process.env.JWT_SECRET) {
    throw new AppError('JWT_SECRET is not configured', 500);
  }

  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
};

const sendAuthResponse = (res, user, statusCode) => {
  const token = signToken(user._id);

  res.status(statusCode).json({
    success: true,
    token,
    data: {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    },
  });
};

const registerUser = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  const existingUser = await User.findOne({ email: email?.toLowerCase() });
  if (existingUser) {
    throw new AppError('Email already exists', 400);
  }

  const user = await User.create({
    name,
    email,
    password,
    role: 'patient',
  });

  sendAuthResponse(res, user, 201);
});

const registerDoctorRequest = asyncHandler(async (req, res) => {
  const { name, email, password, specialization, fees, availableSlots } = req.body;

  if (!name || !email || !password || !specialization || fees === undefined) {
    throw new AppError('name, email, password, specialization and fees are required', 400);
  }

  const existingUser = await User.findOne({ email: email?.toLowerCase() });
  if (existingUser) {
    throw new AppError('Email already exists', 400);
  }

  const user = await User.create({
    name,
    email,
    password,
    role: 'doctor',
  });

  const doctor = await Doctor.create({
    userId: user._id,
    name,
    specialization,
    fees,
    availableSlots: Array.isArray(availableSlots) ? availableSlots : [],
    verificationStatus: 'pending',
  });

  res.status(201).json({
    success: true,
    message: 'Doctor request submitted. Please wait for admin approval.',
    data: {
      doctor,
    },
  });
});

const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new AppError('Email and password are required', 400);
  }

  const user = await User.findOne({ email: email.toLowerCase(), isActive: true }).select('+password');

  if (!user) {
    throw new AppError('Invalid credentials', 401);
  }

  const isPasswordValid = await user.matchPassword(password);

  if (!isPasswordValid) {
    throw new AppError('Invalid credentials', 401);
  }

  if (user.role === 'doctor') {
    const doctorProfile = await Doctor.findOne({ userId: user._id, isActive: true });

    if (!doctorProfile) {
      throw new AppError('Doctor profile not found', 404);
    }

    if (doctorProfile.verificationStatus === 'pending') {
      throw new AppError('Your doctor account is pending admin approval.', 403);
    }

    if (doctorProfile.verificationStatus === 'rejected') {
      throw new AppError('Your doctor account request was rejected. Please contact admin.', 403);
    }
  }

  sendAuthResponse(res, user, 200);
});

const getMe = asyncHandler(async (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      user: req.user,
    },
  });
});

module.exports = {
  registerUser,
  registerDoctorRequest,
  loginUser,
  getMe,
};