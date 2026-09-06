const User = require('../models/User');
const Doctor = require('../models/Doctor');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');

const createDoctor = asyncHandler(async (req, res) => {
  const { name, email, password, specialization, availableSlots, fees } = req.body;

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
    availableSlots: availableSlots || [],
    fees,
    verificationStatus: 'approved',
  });

  res.status(201).json({
    success: true,
    data: {
      doctor,
    },
  });
});

const getDoctors = asyncHandler(async (req, res) => {
  const doctors = await Doctor.find({ isActive: true, verificationStatus: 'approved' })
    .populate('userId', 'email role')
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    count: doctors.length,
    data: {
      doctors,
    },
  });
});

const getDoctorById = asyncHandler(async (req, res) => {
  const doctor = await Doctor.findOne({ _id: req.params.id, isActive: true, verificationStatus: 'approved' }).populate('userId', 'email role');

  if (!doctor) {
    throw new AppError('Doctor not found', 404);
  }

  res.status(200).json({
    success: true,
    data: {
      doctor,
    },
  });
});

const deleteDoctor = asyncHandler(async (req, res) => {
  const doctor = await Doctor.findById(req.params.id);

  if (!doctor) {
    throw new AppError('Doctor not found', 404);
  }

  await User.findByIdAndUpdate(doctor.userId, { isActive: false });
  doctor.isActive = false;
  await doctor.save();

  res.status(200).json({
    success: true,
    message: 'Doctor removed successfully',
  });
});

module.exports = {
  createDoctor,
  getDoctors,
  getDoctorById,
  deleteDoctor,
};