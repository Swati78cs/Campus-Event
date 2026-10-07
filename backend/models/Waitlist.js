const mongoose = require('mongoose');

const waitlistSchema = new mongoose.Schema(
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
    status: {
      type: String,
      enum: {
        values: ['waiting', 'promoted', 'removed', 'cancelled'],
        message: '{VALUE} is not a valid waitlist status',
      },
      default: 'waiting',
      index: true,
    },
    joinedAt: {
      type: Date,
      default: Date.now,
      required: true,
      index: true,
    },
    promotedAt: {
      type: Date,
      default: null,
    },
    removedAt: {
      type: Date,
      default: null,
    },
    promotionReason: {
      type: String,
      enum: ['cancellation', 'capacity_increase', null],
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Compound partial unique index: ensures at most ONE active (waiting) entry per student per event.
// Historical promoted, removed, and cancelled records are preserved without collision.
waitlistSchema.index(
  { event: 1, student: 1 },
  {
    unique: true,
    partialFilterExpression: { status: 'waiting' },
  }
);

// Deterministic FIFO index: orders active waitlist by joinedAt ascending, with _id tiebreaker
waitlistSchema.index({ event: 1, status: 1, joinedAt: 1, _id: 1 });

// Student waitlist query index
waitlistSchema.index({ student: 1, status: 1, joinedAt: -1 });

const Waitlist = mongoose.model('Waitlist', waitlistSchema);

module.exports = Waitlist;
