const { z } = require('zod');

const objectIdRegex = /^[0-9a-fA-F]{24}$/;
const certificateIdRegex = /^CERT-[A-Z0-9]{6,20}$/;

const certificateIdParamSchema = z.object({
  params: z.object({
    certificateId: z
      .string()
      .trim()
      .regex(certificateIdRegex, 'Invalid Certificate ID format (e.g. CERT-ABC123XYZ)'),
  }),
});

const eventIdParamSchema = z.object({
  params: z.object({
    eventId: z.string().regex(objectIdRegex, 'Invalid event ID format'),
  }),
});

const issueCertificateSchema = z.object({
  params: z.object({
    eventId: z.string().regex(objectIdRegex, 'Invalid event ID format'),
  }),
  body: z.object({
    studentId: z.string().regex(objectIdRegex, 'Invalid student ID format'),
  }),
});

const listStudentCertificatesQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).optional().default(1),
    limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  }),
});

module.exports = {
  certificateIdParamSchema,
  eventIdParamSchema,
  issueCertificateSchema,
  listStudentCertificatesQuerySchema,
};
