const mongoose = require('mongoose');

const ticketSchema = new mongoose.Schema(
  {
    registration: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Registration',
      required: [true, 'Registration reference is required'],
    },
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
    token: {
      type: String,
      required: [true, 'Ticket token is required'],
      unique: true,
      trim: true,
    },
    status: {
      type: String,
      enum: {
        values: ['active', 'cancelled', 'used'],
        message: '{VALUE} is not a valid ticket status',
      },
      default: 'active',
      index: true,
    },
    issuedAt: {
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
  }
);

// Compound partial unique index: A student can only have ONE active ticket per event.
// Cancelled tickets are preserved for historical audit and do not collide with new re-registration tickets.
ticketSchema.index(
  { student: 1, event: 1 },
  { unique: true, partialFilterExpression: { status: 'active' } }
);

// Compound partial unique index: Exactly one active ticket per registration document.
ticketSchema.index(
  { registration: 1 },
  { unique: true, partialFilterExpression: { status: 'active' } }
);

ticketSchema.set('toJSON', {
  transform: (doc, ret) => {
    delete ret.__v;
    return ret;
  },
});

const Ticket = mongoose.model('Ticket', ticketSchema);

module.exports = Ticket;
