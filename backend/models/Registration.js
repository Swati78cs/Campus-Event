const mongoose = require('mongoose');

const registrationSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Student reference is required'],
      index: true,
    },
    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event',
      required: [true, 'Event reference is required'],
      index: true,
    },
    status: {
      type: String,
      enum: {
        values: ['active', 'cancelled'],
        message: '{VALUE} is not a valid registration status',
      },
      default: 'active',
      index: true,
    },
    registeredAt: {
      type: Date,
      default: Date.now,
    },
    cancelledAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Compound partial unique index: ensures at most ONE active registration per student per event.
// Historical cancelled records are preserved and do not collide with this index.
registrationSchema.index(
  { student: 1, event: 1 },
  {
    unique: true,
    partialFilterExpression: { status: 'active' },
  }
);

// Event attendee listing index: quickly query active attendees of an event
registrationSchema.index({ event: 1, status: 1, registeredAt: -1 });

// Student dashboard index: quickly query my registrations
registrationSchema.index({ student: 1, status: 1, registeredAt: -1 });

const Registration = mongoose.model('Registration', registrationSchema);

module.exports = Registration;
