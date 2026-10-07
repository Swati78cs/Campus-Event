const certificateService = require('../services/certificateService');

/**
 * GET /api/certificates/my
 * Retrieve paginated certificates for authenticated student.
 */
const listMyCertificates = async (req, res, next) => {
  try {
    const result = await certificateService.getMyCertificates(req.user._id, req.query);
    res.status(200).json({
      success: true,
      message: 'Student certificates retrieved successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/certificates/:certificateId
 * Retrieve certificate details with ownership enforcement.
 */
const getCertificate = async (req, res, next) => {
  try {
    const { certificateId } = req.params;
    const certificate = await certificateService.getCertificateById(certificateId, req.user);
    res.status(200).json({
      success: true,
      message: 'Certificate retrieved successfully',
      data: { certificate },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/certificates/:certificateId/download
 * Generate and stream/send certificate PDF on demand.
 */
const downloadCertificatePDF = async (req, res, next) => {
  try {
    const { certificateId } = req.params;
    const certificate = await certificateService.getCertificateById(certificateId, req.user);
    const pdfBuffer = await certificateService.generateCertificatePDFBuffer(certificate);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="certificate-${certificate.certificateId}.pdf"`
    );
    res.setHeader('Content-Length', pdfBuffer.length);
    res.status(200).end(pdfBuffer);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/certificates/verify/:certificateId
 * Public endpoint to verify certificate authenticity without authentication.
 */
const verifyPublicCertificate = async (req, res, next) => {
  try {
    const { certificateId } = req.params;
    const result = await certificateService.verifyPublicCertificate(certificateId);
    res.status(200).json({
      success: true,
      message: 'Certificate verified successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/events/:eventId/certificates
 * Get event certificate management summary (Organizer/Admin).
 */
const getEventCertificates = async (req, res, next) => {
  try {
    const { eventId } = req.params;
    const result = await certificateService.getEventCertificatesSummary(eventId, req.user);
    res.status(200).json({
      success: true,
      message: 'Event certificate summary retrieved successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/events/:eventId/certificates/issue
 * Issue certificate to a specific attendee (Organizer/Admin).
 */
const issueSingleCertificate = async (req, res, next) => {
  try {
    const { eventId } = req.params;
    const { studentId } = req.body;
    const result = await certificateService.issueCertificate(eventId, studentId, req.user);
    res.status(201).json({
      success: true,
      message: result.message,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/events/:eventId/certificates/issue-all
 * Bulk issue certificates to all eligible attendees of an event (Organizer/Admin).
 */
const bulkIssueEventCertificates = async (req, res, next) => {
  try {
    const { eventId } = req.params;
    const result = await certificateService.bulkIssueCertificates(eventId, req.user);
    res.status(200).json({
      success: true,
      message: `Bulk certificate issuance complete: ${result.newlyIssued} newly issued, ${result.alreadyIssued} already issued.`,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  listMyCertificates,
  getCertificate,
  downloadCertificatePDF,
  verifyPublicCertificate,
  getEventCertificates,
  issueSingleCertificate,
  bulkIssueEventCertificates,
};
