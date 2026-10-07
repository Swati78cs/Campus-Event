const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema(
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
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
      validate: {
        validator: Number.isInteger,
        message: '{VALUE} is not an integer rating between 1 and 5',
      },
    },
    comment: {
      type: String,
      default: '',
      trim: true,
      maxlength: 1000,
    },
  },
  {
    timestamps: true,
  }
);

// Compound unique constraint: one feedback per student per event
feedbackSchema.index({ event: 1, student: 1 }, { unique: true });

// Query index for event feedback listings and aggregations
feedbackSchema.index({ event: 1, createdAt: -1 });

const Feedback = mongoose.model('Feedback', feedbackSchema);

module.exports = Feedback;
