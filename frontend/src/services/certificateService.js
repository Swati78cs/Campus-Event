import { apiClient } from './api';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

if (!API_BASE_URL) {
  throw new Error(
    'VITE_API_BASE_URL is not configured. Please set it in the frontend environment.'
  );
}
/**
 * Frontend Certificate Service
 */
export const certificateService = {
  /**
   * Get paginated certificates for authenticated student.
   */
  async getMyCertificates(params = {}) {
    const query = new URLSearchParams();
    if (params.page) query.append('page', params.page);
    if (params.limit) query.append('limit', params.limit);
    const queryString = query.toString() ? `?${query.toString()}` : '';

    const res = await apiClient(`/certificates/my${queryString}`, { method: 'GET' });
    return res.data;
  },

  /**
   * Get certificate details by certificate ID.
   */
  async getCertificate(certificateId) {
    const res = await apiClient(`/certificates/${certificateId}`, { method: 'GET' });
    return res.data?.certificate;
  },

  /**
   * Public verification of certificate (no auth required).
   */
  async verifyCertificate(certificateId) {
    const res = await apiClient(`/certificates/verify/${certificateId}`, { method: 'GET' });
    return res.data;
  },

  /**
   * Download certificate PDF directly as a blob and trigger browser save.
   */
  async downloadCertificatePDF(certificateId) {
    const url = `${API_BASE_URL}/certificates/${certificateId}/download`;
    const res = await fetch(url, {
      method: 'GET',
      credentials: 'include',
    });

    if (!res.ok) {
      let errData;
      try {
        errData = await res.json();
      } catch (e) {
        errData = null;
      }
      throw new Error(errData?.message || 'Failed to download certificate PDF');
    }

    const blob = await res.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = `certificate-${certificateId}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);
  },

  /**
   * Get certificate management summary for an event (Organizer/Admin).
   */
  async getEventCertificates(eventId) {
    const res = await apiClient(`/events/${eventId}/certificates`, { method: 'GET' });
    return res.data;
  },

  /**
   * Issue a certificate to an individual student attendee.
   */
  async issueCertificate(eventId, studentId) {
    const res = await apiClient(`/events/${eventId}/certificates/issue`, {
      method: 'POST',
      body: JSON.stringify({ studentId }),
    });
    return res.data;
  },

  /**
   * Bulk issue certificates to all eligible attendees of an event.
   */
  async bulkIssueCertificates(eventId) {
    const res = await apiClient(`/events/${eventId}/certificates/issue-all`, {
      method: 'POST',
    });
    return res.data;
  },
};
