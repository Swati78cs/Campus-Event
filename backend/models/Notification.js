const mongoose = require('mongoose');

const notificationTypes = [
  'REGISTRATION_CONFIRMED',
  'REGISTRATION_CANCELLED',
  'WAITLIST_PROMOTED',
  'SEAT_AVAILABLE',
  'EVENT_CANCELLED',
  'EVENT_DATE_CHANGED',
  'EVENT_VENUE_CHANGED',
  'ORGANIZER_ANNOUNCEMENT',
  'CERTIFICATE_READY',
];

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Notification recipient is required'],
      index: true,
    },
    type: {
      type: String,
      enum: {
        values: notificationTypes,
        message: '{VALUE} is not a valid notification type',
      },
      required: [true, 'Notification type is required'],
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Notification title is required'],
      trim: true,
      maxlength: [150, 'Title cannot exceed 150 characters'],
    },
    message: {
      type: String,
      required: [true, 'Notification message is required'],
      trim: true,
      maxlength: [2500, 'Message cannot exceed 2500 characters'],
    },
    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event',
      default: null,
      index: true,
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
    readAt: {
      type: Date,
      default: null,
    },
    dedupKey: {
      type: String,
      default: null,
      index: true,
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

// Indexes based on actual query patterns
// 1. Fetch user notifications sorted newest first
notificationSchema.index({ recipient: 1, createdAt: -1 });

// 2. Query user unread count quickly
notificationSchema.index({ recipient: 1, isRead: 1 });

// 3. Deduplication unique partial index: prevents duplicate identical notifications when dedupKey is supplied
notificationSchema.index(
  { recipient: 1, dedupKey: 1 },
  {
    unique: true,
    partialFilterExpression: { dedupKey: { $type: 'string' } },
  }
);

const Notification = mongoose.model('Notification', notificationSchema);

module.exports = {
  Notification,
  notificationTypes,
};
