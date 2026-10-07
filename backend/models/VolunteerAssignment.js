const mongoose = require('mongoose');

const volunteerAssignmentSchema = new mongoose.Schema(
  {
    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event',
      required: [true, 'Event reference is required'],
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required'],
      index: true,
    },
    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'AssignedBy user reference is required'],
    },
    assignedAt: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: {
        values: ['active', 'removed'],
        message: '{VALUE} is not a valid assignment status',
      },
      default: 'active',
      index: true,
    },
    removedAt: {
      type: Date,
      default: null,
    },
    removedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Compound partial unique index: A user can only have ONE active volunteer assignment per event.
// Historical removed assignments remain preserved in MongoDB without violating uniqueness.
volunteerAssignmentSchema.index(
  { event: 1, user: 1 },
  { unique: true, partialFilterExpression: { status: 'active' } }
);

volunteerAssignmentSchema.set('toJSON', {
  transform: (doc, ret) => {
    delete ret.__v;
    return ret;
  },
});

const VolunteerAssignment = mongoose.model('VolunteerAssignment', volunteerAssignmentSchema);

module.exports = VolunteerAssignment;
