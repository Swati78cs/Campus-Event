const express = require('express');
const {
  listMyCertificates,
  getCertificate,
  downloadCertificatePDF,
  verifyPublicCertificate,
  getEventCertificates,
  issueSingleCertificate,
  bulkIssueEventCertificates,
} = require('../controllers/certificateController');
const { authenticate, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const {
  certificateIdParamSchema,
  eventIdParamSchema,
  issueCertificateSchema,
  listStudentCertificatesQuerySchema,
} = require('../validators/certificateValidators');

const router = express.Router();

// Public Certificate Verification (No auth required)
router.get(
  '/verify/:certificateId',
  validate(certificateIdParamSchema),
  verifyPublicCertificate
);

// Authenticated Student Endpoints
router.get(
  '/my',
  authenticate,
  authorize('student'),
  validate(listStudentCertificatesQuerySchema),
  listMyCertificates
);

// Authenticated Certificate Detail & Download
router.get(
  '/:certificateId/download',
  authenticate,
  validate(certificateIdParamSchema),
  downloadCertificatePDF
);

router.get(
  '/:certificateId',
  authenticate,
  validate(certificateIdParamSchema),
  getCertificate
);

module.exports = router;
