const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema(
  {
    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event',
      required: true,
      index: true,
    },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    ticket: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Ticket',
      required: false,
    },
    checkedInAt: {
      type: Date,
      default: Date.now,
      required: true,
    },
    checkedInBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    method: {
      type: String,
      enum: ['qr', 'manual', 'admin_override'],
      required: true,
    },
    status: {
      type: String,
      enum: ['checked_in', 'overridden'],
      default: 'checked_in',
      required: true,
    },
    overrideReason: {
      type: String,
      default: null,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound unique constraints to guarantee that a student is checked in at most once per event
// and a ticket is used for attendance at most once.
attendanceSchema.index({ event: 1, student: 1 }, { unique: true });
attendanceSchema.index({ ticket: 1 }, { unique: true, sparse: true });

const Attendance = mongoose.model('Attendance', attendanceSchema);

module.exports = Attendance;
