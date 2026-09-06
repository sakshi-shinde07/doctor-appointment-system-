const User = require('../models/User');
const Doctor = require('../models/Doctor');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');

const getUsers = asyncHandler(async (req, res) => {
  const users = await User.find().select('-password').sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    count: users.length,
    data: {
      users,
    },
  });
});

const updateUser = asyncHandler(async (req, res) => {
  const { name, email, role, isActive } = req.body;

  const user = await User.findById(req.params.id);
  if (!user) {
    throw new AppError('User not found', 404);
  }

  if (name !== undefined) user.name = name;
  if (email !== undefined) user.email = email.toLowerCase();
  if (role !== undefined) user.role = role;
  if (isActive !== undefined) user.isActive = isActive;

  await user.save();

  res.status(200).json({
    success: true,
    message: 'User updated successfully',
    data: {
      user,
    },
  });
});

const getDoctorRequests = asyncHandler(async (req, res) => {
  const doctorRequests = await Doctor.find({ verificationStatus: 'pending' })
    .populate('userId', 'name email role isActive')
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    count: doctorRequests.length,
    data: {
      doctorRequests,
    },
  });
});

const updateDoctorRequestStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  if (!['approved', 'rejected'].includes(status)) {
    throw new AppError('Status must be approved or rejected', 400);
  }

  const doctor = await Doctor.findById(req.params.id);
  if (!doctor) {
    throw new AppError('Doctor request not found', 404);
  }

  doctor.verificationStatus = status;
  await doctor.save();

  const user = await User.findById(doctor.userId);
  if (user) {
    user.isActive = status === 'approved';
    await user.save();
  }

  res.status(200).json({
    success: true,
    message: `Doctor request ${status}`,
    data: {
      doctor,
    },
  });
});

const updateDoctor = asyncHandler(async (req, res) => {
  const { name, specialization, fees, availableSlots, isActive, verificationStatus } = req.body;

  const doctor = await Doctor.findById(req.params.id);
  if (!doctor) {
    throw new AppError('Doctor not found', 404);
  }

  if (name !== undefined) doctor.name = name;
  if (specialization !== undefined) doctor.specialization = specialization;
  if (fees !== undefined) doctor.fees = fees;
  if (availableSlots !== undefined) doctor.availableSlots = availableSlots;
  if (isActive !== undefined) doctor.isActive = isActive;
  if (verificationStatus !== undefined) doctor.verificationStatus = verificationStatus;

  await doctor.save();

  const user = await User.findById(doctor.userId);
  if (user) {
    user.name = doctor.name;
    user.isActive = doctor.isActive && doctor.verificationStatus === 'approved';
    await user.save();
  }

  res.status(200).json({
    success: true,
    message: 'Doctor updated successfully',
    data: {
      doctor,
    },
  });
});

const deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    throw new AppError('User not found', 404);
  }

  user.isActive = false;
  await user.save();

  if (user.role === 'doctor') {
    const doctor = await Doctor.findOne({ userId: user._id });
    if (doctor) {
      doctor.isActive = false;
      await doctor.save();
    }
  }

  res.status(200).json({
    success: true,
    message: 'User removed successfully',
  });
});

module.exports = {
  getUsers,
  updateUser,
  deleteUser,
  getDoctorRequests,
  updateDoctorRequestStatus,
  updateDoctor,
};