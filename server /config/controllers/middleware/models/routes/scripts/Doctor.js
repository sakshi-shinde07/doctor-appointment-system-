const mongoose = require('mongoose');

const doctorSlotSchema = new mongoose.Schema(
  {
    date: {
      type: String,
      required: [true, 'Slot date is required'],
      trim: true,
    },
    time: {
      type: String,
      required: [true, 'Slot time is required'],
      trim: true,
    },
  },
  { _id: false }
);

const doctorSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    name: {
      type: String,
      required: [true, 'Doctor name is required'],
      trim: true,
    },
    specialization: {
      type: String,
      required: [true, 'Specialization is required'],
      trim: true,
    },
    availableSlots: {
      type: [doctorSlotSchema],
      default: [],
    },
    fees: {
      type: Number,
      required: [true, 'Fees are required'],
      min: 0,
    },
    verificationStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'approved',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Doctor', doctorSchema);