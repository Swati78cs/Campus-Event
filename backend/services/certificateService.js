const mongoose = require('mongoose');
const crypto = require('crypto');
const PDFDocument = require('pdfkit');
const Certificate = require('../models/Certificate');
const Event = require('../models/Event');
const Club = require('../models/Club');
const User = require('../models/User');
const Attendance = require('../models/Attendance');
const notificationService = require('./notificationService');

class CertificateError extends Error {
  constructor(message, code = 'CERTIFICATE_ERROR', statusCode = 400, details = {}) {
    super(message);
    this.name = 'CertificateError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

/**
 * Generate a unique, public-safe certificate ID.
 * Format: CERT-<10 HEX CHARACTERS>
 */
const generateCertificateId = () => {
  const randomHex = crypto.randomBytes(5).toString('hex').toUpperCase();
  return `CERT-${randomHex}`;
};

/**
 * Assert that the user is authorized to manage certificates for the given event.
 * Admins have global permission. Organizers must manage the event's club.
 */
const assertCertificateManagementAccess = async (event, user) => {
  if (user.role === 'admin') {
    return true;
  }

  if (user.role === 'organizer') {
    const club = await Club.findById(event.club);
    const isAssigned =
      club &&
      club.organizers &&
      club.organizers.some((orgId) => orgId.toString() === user._id.toString());

    if (!isAssigned) {
      throw new CertificateError(
        'You are not authorized to manage certificates for this club event.',
        'UNAUTHORIZED_CERTIFICATE_MANAGEMENT',
        403
      );
    }
    return true;
  }

  throw new CertificateError(
    'Access denied: Only event organizers and administrators can manage certificates.',
    'UNAUTHORIZED_CERTIFICATE_MANAGEMENT',
    403
  );
};

/**
 * Verify event completion and certificate-enabled state.
 */
const assertEventEligibleForCertificates = (event) => {
  if (!event.certificateEnabled) {
    throw new CertificateError(
      'Certificates are not enabled for this event.',
      'CERTIFICATES_NOT_ENABLED',
      400
    );
  }

  const now = new Date();
  const eventEnd = new Date(event.endDateTime);
  if (now <= eventEnd && event.status !== 'cancelled') {
    throw new CertificateError(
      'Certificates can only be issued for completed events.',
      'EVENT_NOT_COMPLETED',
      400
    );
  }

  if (event.status === 'cancelled') {
    throw new CertificateError(
      'Cannot issue certificates for a cancelled event.',
      'EVENT_NOT_COMPLETED',
      400
    );
  }
};

/**
 * Check if an individual attendee is eligible for a certificate based on Attendance.
 */
const checkAttendeeEligibility = async (eventId, studentId) => {
  const student = await User.findById(studentId);
  if (!student || !student.isActive) {
    return { eligible: false, reason: 'INACTIVE_USER', student };
  }

  const attendance = await Attendance.findOne({
    event: eventId,
    student: studentId,
    status: { $in: ['checked_in', 'overridden'] },
  });

  if (!attendance) {
    return { eligible: false, reason: 'NO_ATTENDANCE', student };
  }

  return { eligible: true, student, attendance };
};

/**
 * Get Certificate management summary for an event (Organizer/Admin).
 */
const getEventCertificatesSummary = async (eventId, currentUser) => {
  const event = await Event.findById(eventId).populate('club', 'name category organizers');
  if (!event) {
    throw new CertificateError('Event not found.', 'EVENT_NOT_FOUND', 404);
  }

  await assertCertificateManagementAccess(event, currentUser);

  const [attendances, existingCertificates] = await Promise.all([
    Attendance.find({
      event: eventId,
      status: { $in: ['checked_in', 'overridden'] },
    }).populate('student', 'name email isActive'),
    Certificate.find({ event: eventId }),
  ]);

  const certMap = new Map();
  for (const cert of existingCertificates) {
    certMap.set(cert.student.toString(), cert);
  }

  const attendees = attendances.map((att) => {
    const student = att.student;
    const cert = student ? certMap.get(student._id.toString()) : null;
    return {
      studentId: student?._id || att.student,
      name: student?.name || 'Unknown Attendee',
      email: student?.email || 'N/A',
      isActive: student?.isActive ?? false,
      attendanceStatus: att.status,
      checkedInAt: att.checkedInAt,
      method: att.method,
      hasCertificate: Boolean(cert),
      certificateId: cert?.certificateId || null,
      issuedAt: cert?.issuedAt || null,
    };
  });

  const totalAttended = attendees.length;
  const totalIssued = existingCertificates.length;
  const pendingIssuance = attendees.filter((a) => !a.hasCertificate && a.isActive).length;

  const now = new Date();
  const isCompleted = now > new Date(event.endDateTime) && event.status === 'published';

  return {
    event: {
      _id: event._id,
      title: event.title,
      club: event.club,
      startDateTime: event.startDateTime,
      endDateTime: event.endDateTime,
      status: event.status,
      certificateEnabled: Boolean(event.certificateEnabled),
      isCompleted,
    },
    stats: {
      totalAttended,
      totalIssued,
      pendingIssuance,
    },
    attendees,
  };
};

/**
 * Issue a certificate to an eligible student (idempotent, concurrency-safe).
 */
const issueCertificate = async (eventId, studentId, currentUser) => {
  const event = await Event.findById(eventId).populate('club', 'name');
  if (!event) {
    throw new CertificateError('Event not found.', 'EVENT_NOT_FOUND', 404);
  }

  await assertCertificateManagementAccess(event, currentUser);
  assertEventEligibleForCertificates(event);

  const eligibility = await checkAttendeeEligibility(eventId, studentId);
  if (!eligibility.eligible) {
    throw new CertificateError(
      'Student is not eligible for a certificate. Authoritative attendance record is required.',
      'CERTIFICATE_NOT_ELIGIBLE',
      400
    );
  }

  const student = eligibility.student;

  // Check for existing certificate (idempotent response)
  const existingCert = await Certificate.findOne({ event: eventId, student: studentId });
  if (existingCert) {
    return {
      certificate: existingCert,
      alreadyIssued: true,
      message: 'Certificate has already been issued to this student.',
    };
  }

  const maxRetries = 3;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Re-verify inside transaction to prevent race conditions
      const doubleCheck = await Certificate.findOne({ event: eventId, student: studentId }).session(
        session
      );
      if (doubleCheck) {
        await session.commitTransaction();
        session.endSession();
        return {
          certificate: doubleCheck,
          alreadyIssued: true,
          message: 'Certificate has already been issued to this student.',
        };
      }

      const certificateId = generateCertificateId();
      const [newCertificate] = await Certificate.create(
        [
          {
            event: eventId,
            student: studentId,
            certificateId,
            issuedBy: currentUser._id,
            issuedAt: new Date(),
            status: 'issued',
            metadata: {
              studentName: student.name,
              eventTitle: event.title,
              clubName: event.club?.name || '',
              eventDate: event.startDateTime,
            },
          },
        ],
        { session }
      );

      await session.commitTransaction();
      session.endSession();

      // Trigger Phase 10 in-app notification (isolated from certificate transaction)
      try {
        await notificationService.createNotification({
          recipient: studentId,
          type: 'CERTIFICATE_READY',
          title: `Certificate Available: ${event.title}`,
          message: `Your participation certificate for "${event.title}" is ready! You can view and download it in My Certificates.`,
          eventId: event._id,
          dedupKey: `cert_ready_${event._id}_${studentId}`,
          metadata: {
            certificateId: newCertificate.certificateId,
            eventTitle: event.title,
          },
        });
      } catch (notifErr) {
        console.error('[CertificateService] Notification delivery warning:', notifErr.message);
      }

      return {
        certificate: newCertificate,
        alreadyIssued: false,
        message: 'Certificate issued successfully.',
      };
    } catch (err) {
      await session.abortTransaction();
      session.endSession();

      if (err.code === 11000) {
        // Concurrency duplicate handled cleanly
        const concurrentCert = await Certificate.findOne({ event: eventId, student: studentId });
        if (concurrentCert) {
          return {
            certificate: concurrentCert,
            alreadyIssued: true,
            message: 'Certificate has already been issued to this student.',
          };
        }
      }

      const isTransient =
        (typeof err.hasErrorLabel === 'function' && err.hasErrorLabel('TransientTransactionError')) ||
        err.code === 112 ||
        (err.message && err.message.includes('WriteConflict'));

      if (isTransient && attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, attempt * 30));
        continue;
      }

      throw err;
    }
  }
};

/**
 * Bulk issue certificates to all eligible attendees of a completed event.
 */
const bulkIssueCertificates = async (eventId, currentUser) => {
  const event = await Event.findById(eventId).populate('club', 'name');
  if (!event) {
    throw new CertificateError('Event not found.', 'EVENT_NOT_FOUND', 404);
  }

  await assertCertificateManagementAccess(event, currentUser);
  assertEventEligibleForCertificates(event);

  const attendances = await Attendance.find({
    event: eventId,
    status: { $in: ['checked_in', 'overridden'] },
  }).populate('student', 'name email isActive');

  const existingCertificates = await Certificate.find({ event: eventId });
  const issuedStudentIds = new Set(existingCertificates.map((c) => c.student.toString()));

  const eligibleAttendees = attendances.filter((att) => att.student && att.student.isActive);

  let newlyIssuedCount = 0;
  let alreadyIssuedCount = 0;

  for (const att of eligibleAttendees) {
    const studentIdStr = att.student._id.toString();
    if (issuedStudentIds.has(studentIdStr)) {
      alreadyIssuedCount++;
      continue;
    }

    try {
      const result = await issueCertificate(eventId, att.student._id, currentUser);
      if (result.alreadyIssued) {
        alreadyIssuedCount++;
      } else {
        newlyIssuedCount++;
        issuedStudentIds.add(studentIdStr);
      }
    } catch (issueErr) {
      console.error(`Failed to issue certificate for student ${studentIdStr}:`, issueErr.message);
    }
  }

  return {
    eligible: eligibleAttendees.length,
    alreadyIssued: alreadyIssuedCount,
    newlyIssued: newlyIssuedCount,
  };
};

/**
 * Retrieve paginated certificates for authenticated student.
 */
const getMyCertificates = async (studentId, queryParams = {}) => {
  const { page = 1, limit = 20 } = queryParams;
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const skip = (pageNum - 1) * limitNum;

  const filter = { student: studentId };

  const [certificates, total] = await Promise.all([
    Certificate.find(filter)
      .populate({
        path: 'event',
        select: 'title startDateTime endDateTime venue category club',
        populate: { path: 'club', select: 'name category' },
      })
      .sort({ issuedAt: -1 })
      .skip(skip)
      .limit(limitNum),
    Certificate.countDocuments(filter),
  ]);

  const totalPages = Math.ceil(total / limitNum) || (total === 0 ? 0 : 1);

  return {
    certificates,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages,
    },
  };
};

/**
 * Retrieve certificate details with ownership enforcement.
 */
const getCertificateById = async (certificateId, currentUser) => {
  const certificate = await Certificate.findOne({ certificateId }).populate([
    {
      path: 'event',
      select: 'title startDateTime endDateTime venue category club',
      populate: { path: 'club', select: 'name category organizers' },
    },
    { path: 'student', select: 'name email' },
    { path: 'issuedBy', select: 'name email role' },
  ]);

  if (!certificate) {
    throw new CertificateError('Certificate not found.', 'CERTIFICATE_NOT_FOUND', 404);
  }

  // Authorization check
  if (currentUser) {
    if (currentUser.role === 'admin') {
      return certificate;
    }

    if (currentUser.role === 'student') {
      if (certificate.student._id.toString() !== currentUser._id.toString()) {
        throw new CertificateError(
          'You are not authorized to view this certificate.',
          'UNAUTHORIZED_CERTIFICATE_ACCESS',
          403
        );
      }
      return certificate;
    }

    if (currentUser.role === 'organizer') {
      const clubOrganizers = certificate.event?.club?.organizers || [];
      const managesClub = clubOrganizers.some(
        (orgId) => orgId.toString() === currentUser._id.toString()
      );
      if (
        !managesClub &&
        certificate.student._id.toString() !== currentUser._id.toString()
      ) {
        throw new CertificateError(
          'You are not authorized to view this certificate.',
          'UNAUTHORIZED_CERTIFICATE_ACCESS',
          403
        );
      }
      return certificate;
    }
  }

  return certificate;
};

/**
 * Public Certificate Verification (no auth, safe attributes only).
 */
const verifyPublicCertificate = async (certificateId) => {
  const certificate = await Certificate.findOne({ certificateId }).populate([
    {
      path: 'event',
      select: 'title startDateTime endDateTime venue category club',
      populate: { path: 'club', select: 'name' },
    },
    { path: 'student', select: 'name' },
  ]);

  if (!certificate) {
    throw new CertificateError(
      'Invalid certificate ID or certificate not found.',
      'CERTIFICATE_NOT_FOUND',
      404
    );
  }

  const studentName =
    certificate.metadata?.studentName || certificate.student?.name || 'Verified Attendee';
  const eventTitle =
    certificate.metadata?.eventTitle || certificate.event?.title || 'Campus Event';
  const clubName =
    certificate.metadata?.clubName || certificate.event?.club?.name || 'College Club';
  const eventDate =
    certificate.metadata?.eventDate || certificate.event?.startDateTime || certificate.issuedAt;

  // Safe public response ONLY (no MongoDB IDs, no emails, no tickets, no private data)
  return {
    valid: true,
    certificateId: certificate.certificateId,
    status: certificate.status,
    studentName,
    eventTitle,
    clubName,
    eventDate,
    issuedAt: certificate.issuedAt,
  };
};

/**
 * Generate Certificate PDF in memory using PDFKit.
 * Returns a Promise that resolves with a Buffer.
 */
const generateCertificatePDFBuffer = async (certificate) => {
  return new Promise((resolve, reject) => {
    try {
      // Landscape A4: 841.89 x 595.28 points
      const doc = new PDFDocument({
        size: 'A4',
        layout: 'landscape',
        margin: 40,
        info: {
          Title: `Certificate - ${certificate.certificateId}`,
          Author: 'Campus Event Management & QR Ticketing Platform',
          Subject: 'Certificate of Participation',
        },
      });

      const buffers = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(buffers);
        resolve(pdfBuffer);
      });
      doc.on('error', (err) => reject(err));

      const studentName =
        certificate.metadata?.studentName ||
        certificate.student?.name ||
        'Verified Student';
      const eventTitle =
        certificate.metadata?.eventTitle ||
        certificate.event?.title ||
        'Campus Event';
      const clubName =
        certificate.metadata?.clubName ||
        certificate.event?.club?.name ||
        'College Club';

      const eventDateStr = new Date(
        certificate.metadata?.eventDate ||
          certificate.event?.startDateTime ||
          certificate.issuedAt
      ).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

      const issueDateStr = new Date(certificate.issuedAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

      const width = doc.page.width;
      const height = doc.page.height;

      // Outer Decorative Border (Navy)
      doc.rect(20, 20, width - 40, height - 40)
        .lineWidth(3)
        .strokeColor('#1E293B')
        .stroke();

      // Inner Accent Border (Gold / Indigo)
      doc.rect(26, 26, width - 52, height - 52)
        .lineWidth(1)
        .strokeColor('#D97706')
        .stroke();

      // Header Brand
      doc.moveDown(1.5);
      doc
        .fontSize(12)
        .fillColor('#64748B')
        .font('Helvetica-Bold')
        .text('CAMPUS EVENT MANAGEMENT & QR TICKETING PLATFORM', {
          align: 'center',
          characterSpacing: 2,
        });

      // Main Certificate Title
      doc.moveDown(0.8);
      doc
        .fontSize(28)
        .fillColor('#0F172A')
        .font('Helvetica-Bold')
        .text('CERTIFICATE OF PARTICIPATION', {
          align: 'center',
          characterSpacing: 1,
        });

      // Decorative divider
      doc.moveDown(0.5);
      const centerX = width / 2;
      doc
        .moveTo(centerX - 100, doc.y)
        .lineTo(centerX + 100, doc.y)
        .lineWidth(2)
        .strokeColor('#D97706')
        .stroke();

      // Certificate Body Text
      doc.moveDown(1.2);
      doc
        .fontSize(14)
        .fillColor('#475569')
        .font('Helvetica')
        .text('This is to proudly certify that', {
          align: 'center',
        });

      // Student Name (Prominent)
      doc.moveDown(0.8);
      doc
        .fontSize(26)
        .fillColor('#1E3A8A')
        .font('Helvetica-Bold')
        .text(studentName, {
          align: 'center',
        });

      // Underline for student name
      const nameY = doc.y + 4;
      doc
        .moveTo(centerX - 150, nameY)
        .lineTo(centerX + 150, nameY)
        .lineWidth(0.8)
        .strokeColor('#CBD5E1')
        .stroke();

      // Event participation statement
      doc.moveDown(1.2);
      doc
        .fontSize(14)
        .fillColor('#475569')
        .font('Helvetica')
        .text('has successfully attended and participated in', {
          align: 'center',
        });

      // Event Title
      doc.moveDown(0.6);
      doc
        .fontSize(20)
        .fillColor('#0F172A')
        .font('Helvetica-Bold')
        .text(`"${eventTitle}"`, {
          align: 'center',
        });

      // Club & Date Details
      doc.moveDown(0.6);
      doc
        .fontSize(13)
        .fillColor('#64748B')
        .font('Helvetica')
        .text(`Organized by ${clubName} on ${eventDateStr}`, {
          align: 'center',
        });

      // Footer Section: Verification ID & Issue Date
      const footerY = height - 90;

      // Left Footer: Issue Date
      doc
        .fontSize(10)
        .fillColor('#64748B')
        .font('Helvetica-Bold')
        .text('DATE OF ISSUANCE', 60, footerY);
      doc
        .fontSize(11)
        .fillColor('#1E293B')
        .font('Helvetica')
        .text(issueDateStr, 60, footerY + 14);

      // Center Footer: Official Stamp note
      doc
        .fontSize(9)
        .fillColor('#94A3B8')
        .font('Helvetica')
        .text('Authoritatively verified via Campus QR Attendance', centerX - 120, footerY + 8, {
          width: 240,
          align: 'center',
        });

      // Right Footer: Certificate ID
      doc
        .fontSize(10)
        .fillColor('#64748B')
        .font('Helvetica-Bold')
        .text('CERTIFICATE ID', width - 240, footerY, { align: 'right', width: 180 });
      doc
        .fontSize(11)
        .fillColor('#1E3A8A')
        .font('Helvetica-Bold')
        .text(certificate.certificateId, width - 240, footerY + 14, {
          align: 'right',
          width: 180,
        });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
};

module.exports = {
  CertificateError,
  generateCertificateId,
  assertCertificateManagementAccess,
  assertEventEligibleForCertificates,
  checkAttendeeEligibility,
  getEventCertificatesSummary,
  issueCertificate,
  bulkIssueCertificates,
  getMyCertificates,
  getCertificateById,
  verifyPublicCertificate,
  generateCertificatePDFBuffer,
};
