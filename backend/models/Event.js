const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Event title is required'],
      trim: true,
      minlength: [2, 'Event title must be at least 2 characters long'],
      maxlength: [120, 'Event title cannot exceed 120 characters'],
    },
    description: {
      type: String,
      required: [true, 'Event description is required'],
      trim: true,
      minlength: [10, 'Event description must be at least 10 characters long'],
      maxlength: [3000, 'Event description cannot exceed 3000 characters'],
    },
    club: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Club',
      required: [true, 'Event must be associated with a club'],
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Event creator reference is required'],
    },
    category: {
      type: String,
      required: [true, 'Event category is required'],
      enum: {
        values: ['Technical', 'Cultural', 'Sports', 'Academic', 'Social', 'Other'],
        message: '{VALUE} is not a valid event category',
      },
      default: 'Technical',
    },
    startDateTime: {
      type: Date,
      required: [true, 'Start date and time is required'],
    },
    endDateTime: {
      type: Date,
      required: [true, 'End date and time is required'],
    },
    venue: {
      type: String,
      required: [true, 'Event venue is required'],
      trim: true,
      minlength: [2, 'Venue must be at least 2 characters long'],
      maxlength: [200, 'Venue cannot exceed 200 characters'],
    },
    capacity: {
      type: Number,
      required: [true, 'Event capacity is required'],
      min: [1, 'Capacity must be at least 1 attendee'],
    },
    registrationDeadline: {
      type: Date,
      required: [true, 'Registration deadline is required'],
    },
    status: {
      type: String,
      enum: {
        values: ['draft', 'published', 'cancelled'],
        message: '{VALUE} is not a valid status',
      },
      default: 'draft',
    },
    bannerUrl: {
      type: String,
      trim: true,
      default: '',
    },
    cancellationReason: {
      type: String,
      trim: true,
      default: '',
    },
    registeredCount: {
      type: Number,
      default: 0,
      min: [0, 'Registered count cannot be negative'],
    },
    allowCancellation: {
      type: Boolean,
      default: true,
    },
    cancellationDeadline: {
      type: Date,
      default: null,
    },
    cancelledAt: {
      type: Date,
      default: null,
    },
    cancelledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    certificateEnabled: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual property to dynamically compute lifecycle phase based on current time
eventSchema.virtual('phase').get(function () {
  if (this.status === 'cancelled') {
    return 'cancelled';
  }

  if (this.status === 'draft') {
    return 'draft';
  }

  // Published event lifecycle based on current UTC time
  const now = new Date();
  const deadline = new Date(this.registrationDeadline);
  const end = new Date(this.endDateTime);

  if (now > end) {
    return 'completed';
  }

  if (now >= deadline) {
    return 'registration_closed';
  }

  return 'registration_open';
});

// Virtual property for remaining available seats
eventSchema.virtual('availableSeats').get(function () {
  return Math.max(0, this.capacity - (this.registeredCount || 0));
});

// Virtual property for capacity status (AVAILABLE, ALMOST_FULL, FULL)
eventSchema.virtual('capacityStatus').get(function () {
  const count = this.registeredCount || 0;
  if (count >= this.capacity) {
    return 'FULL';
  }
  if (count / this.capacity >= 0.8) {
    return 'ALMOST_FULL';
  }
  return 'AVAILABLE';
});

// Indexes for performant filtering and date sorting
eventSchema.index({ club: 1, startDateTime: 1 });
eventSchema.index({ status: 1, startDateTime: 1 });

const Event = mongoose.model('Event', eventSchema);

module.exports = Event;
