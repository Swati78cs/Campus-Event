const mongoose = require('mongoose');

const clubSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Club name is required'],
      unique: true,
      trim: true,
      minlength: [2, 'Club name must be at least 2 characters long'],
      maxlength: [100, 'Club name cannot exceed 100 characters'],
    },
    description: {
      type: String,
      required: [true, 'Club description is required'],
      trim: true,
      minlength: [10, 'Club description must be at least 10 characters long'],
      maxlength: [1000, 'Club description cannot exceed 1000 characters'],
    },
    category: {
      type: String,
      required: [true, 'Club category is required'],
      enum: {
        values: ['Technical', 'Cultural', 'Sports', 'Academic', 'Social', 'Other'],
        message: '{VALUE} is not a valid club category',
      },
      default: 'Technical',
    },
    organizers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Optimize query index on name
clubSchema.index({ name: 1 }, { unique: true });

const Club = mongoose.model('Club', clubSchema);

module.exports = Club;
