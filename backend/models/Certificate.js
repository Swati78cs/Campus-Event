const mongoose = require('mongoose');

const certificateSchema = new mongoose.Schema(
  {
    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event',
      required: [true, 'Event reference is required'],
      index: true,
    },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Student reference is required'],
      index: true,
    },
    certificateId: {
      type: String,
      required: [true, 'Certificate ID is required'],
      unique: true,
      trim: true,
      uppercase: true,
    },
    issuedAt: {
      type: Date,
      default: Date.now,
      required: true,
    },
    issuedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Issuer reference is required'],
    },
    status: {
      type: String,
      enum: {
        values: ['issued'],
        message: '{VALUE} is not a valid certificate status',
      },
      default: 'issued',
      required: true,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

// Database-level uniqueness constraints
// 1. A student can have at most one certificate per event
certificateSchema.index({ event: 1, student: 1 }, { unique: true });

// 2. Query patterns
certificateSchema.index({ student: 1, issuedAt: -1 });
certificateSchema.index({ event: 1, issuedAt: -1 });

const Certificate = mongoose.model('Certificate', certificateSchema);

module.exports = Certificate;
