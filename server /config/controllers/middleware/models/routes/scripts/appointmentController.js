const Appointment = require('../models/Appointment');
const Doctor = require('../models/Doctor');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');

const getAppointmentQueryForUser = (user) => {
  if (user.role === 'patient') {
    return { patientId: user._id };
  }

  if (user.role === 'doctor') {
    if (!user.doctorProfileId) {
      throw new AppError('Doctor profile not found', 404);
    }

    return { doctorId: user.doctorProfileId };
  }

  return {};
};

const bookAppointment = asyncHandler(async (req, res) => {
  const { doctorId, date, time } = req.body;

  if (!doctorId || !date || !time) {
    throw new AppError('doctorId, date, and time are required', 400);
  }

  const doctor = await Doctor.findOne({ _id: doctorId, isActive: true, verificationStatus: 'approved' });

  if (!doctor) {
    throw new AppError('Doctor not found', 404);
  }

  const slotIsListed =
    doctor.availableSlots.length === 0 ||
    doctor.availableSlots.some((slot) => slot.date === date && slot.time === time);

  if (!slotIsListed) {
    throw new AppError('Requested slot is not available', 400);
  }

  const existingAppointment = await Appointment.findOne({
    doctorId,
    date,
    time,
    status: { $in: ['pending', 'approved'] },
  });

  if (existingAppointment) {
    throw new AppError('This time slot is already booked', 400);
  }

  const appointment = await Appointment.create({
    patientId: req.user._id,
    doctorId,
    date,
    time,
  });

  const populatedAppointment = await Appointment.findById(appointment._id)
    .populate('patientId', 'name email role')
    .populate('doctorId', 'name specialization fees availableSlots');

  res.status(201).json({
    success: true,
    data: {
      appointment: populatedAppointment,
    },
  });
});

const cancelAppointment = asyncHandler(async (req, res) => {
  const appointment = await Appointment.findById(req.params.id);

  if (!appointment) {
    throw new AppError('Appointment not found', 404);
  }

  const isOwner = appointment.patientId.toString() === req.user._id.toString();
  const isDoctor = req.user.role === 'doctor' && req.doctor && appointment.doctorId.toString() === req.doctor._id.toString();
  const isAdmin = req.user.role === 'admin';

  if (!isOwner && !isDoctor && !isAdmin) {
    throw new AppError('Access denied', 403);
  }

  appointment.status = 'cancelled';
  await appointment.save();

  const populatedAppointment = await Appointment.findById(appointment._id)
    .populate('patientId', 'name email role')
    .populate('doctorId', 'name specialization fees availableSlots');

  res.status(200).json({
    success: true,
    message: 'Appointment cancelled successfully',
    data: {
      appointment: populatedAppointment,
    },
  });
});

const getAppointments = asyncHandler(async (req, res) => {
  const query = getAppointmentQueryForUser(req.user);
  const appointments = await Appointment.find(query)
    .populate('patientId', 'name email role')
    .populate('doctorId', 'name specialization fees availableSlots')
    .sort({ date: -1, time: -1 });

  res.status(200).json({
    success: true,
    count: appointments.length,
    data: {
      appointments,
    },
  });
});

const getAppointmentById = asyncHandler(async (req, res) => {
  const appointment = await Appointment.findById(req.params.id)
    .populate('patientId', 'name email role')
    .populate('doctorId', 'name specialization fees availableSlots');

  if (!appointment) {
    throw new AppError('Appointment not found', 404);
  }

  const isOwner = appointment.patientId._id.toString() === req.user._id.toString();
  const isDoctor = req.user.role === 'doctor' && req.doctor && appointment.doctorId._id.toString() === req.doctor._id.toString();
  const isAdmin = req.user.role === 'admin';

  if (!isOwner && !isDoctor && !isAdmin) {
    throw new AppError('Access denied', 403);
  }

  res.status(200).json({
    success: true,
    data: {
      appointment,
    },
  });
});

const updateAppointmentStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;

  if (!['approved', 'rejected'].includes(status)) {
    throw new AppError('Invalid status value', 400);
  }

  const appointment = await Appointment.findById(req.params.id);

  if (!appointment) {
    throw new AppError('Appointment not found', 404);
  }

  if (req.user.role !== 'doctor') {
    throw new AppError('Access denied', 403);
  }

  if (!req.doctor) {
    throw new AppError('Doctor profile not found', 404);
  }

  if (appointment.doctorId.toString() !== req.doctor._id.toString()) {
    throw new AppError('Access denied', 403);
  }

  if (appointment.status !== 'pending') {
    throw new AppError('Only pending appointments can be updated', 400);
  }

  appointment.status = status;
  await appointment.save();

  const populatedAppointment = await Appointment.findById(appointment._id)
    .populate('patientId', 'name email role')
    .populate('doctorId', 'name specialization fees availableSlots');

  res.status(200).json({
    success: true,
    data: {
      appointment: populatedAppointment,
    },
  });
});

const approveAppointment = asyncHandler(async (req, res) => {
  req.body = { status: 'approved' };
  return updateAppointmentStatus(req, res);
});

const rejectAppointment = asyncHandler(async (req, res) => {
  req.body = { status: 'rejected' };
  return updateAppointmentStatus(req, res);
});

module.exports = {
  bookAppointment,
  cancelAppointment,
  getAppointments,
  getAppointmentById,
  approveAppointment,
  rejectAppointment,
};