import React, { useState, useEffect } from 'react';
import {
  searchAttendees,
  checkInManual,
  overrideAttendance,
} from '../../services/attendanceService';
import { useAuth } from '../../context/AuthContext';

export default function ManualAttendeeSearch({ eventId, onCheckInSuccess }) {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [searchTerm, setSearchTerm] = useState('');
  const [attendees, setAttendees] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [feedback, setFeedback] = useState(null);

  // Admin Override Modal State
  const [overrideModalOpen, setOverrideModalOpen] = useState(false);
  const [selectedStudentForOverride, setSelectedStudentForOverride] = useState(null);
  const [overrideReason, setOverrideReason] = useState('');
  const [overrideSubmitting, setOverrideSubmitting] = useState(false);

  useEffect(() => {
    loadAttendees(searchTerm);
  }, [eventId]);

  const loadAttendees = async (query = '') => {
    try {
      setIsLoading(true);
      const res = await searchAttendees(eventId, { search: query, limit: 30 });
      if (res?.success && res?.data?.attendees) {
        setAttendees(res.data.attendees);
      }
    } catch (err) {
      setFeedback({ type: 'error', message: err.message || 'Failed to search attendees' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadAttendees(searchTerm);
  };

  const handleManualCheckIn = async (studentId) => {
    try {
      setActionLoadingId(studentId);
      setFeedback(null);
      const res = await checkInManual(eventId, studentId);
      if (res?.success) {
        setFeedback({
          type: 'success',
          message: `Successfully checked in ${res.data?.student?.name || 'student'}`,
        });
        await loadAttendees(searchTerm);
        if (onCheckInSuccess) onCheckInSuccess(res.data);
      }
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.message || 'Manual check-in failed',
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleOpenOverride = (student) => {
    setSelectedStudentForOverride(student);
    setOverrideReason('');
    setOverrideModalOpen(true);
  };

  const handleConfirmOverride = async (e) => {
    e.preventDefault();
    if (!selectedStudentForOverride || !overrideReason.trim()) return;

    try {
      setOverrideSubmitting(true);
      setFeedback(null);
      const res = await overrideAttendance(
        eventId,
        selectedStudentForOverride._id,
        overrideReason.trim()
      );
      if (res?.success) {
        setFeedback({
          type: 'success',
          message: `Admin override check-in recorded for ${selectedStudentForOverride.name}`,
        });
        setOverrideModalOpen(false);
        setSelectedStudentForOverride(null);
        setOverrideReason('');
        await loadAttendees(searchTerm);
        if (onCheckInSuccess) onCheckInSuccess(res.data);
      }
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.message || 'Admin override failed',
      });
    } finally {
      setOverrideSubmitting(false);
    }
  };

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 sm:p-6 shadow-xl">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h3 className="text-lg font-semibold text-white">Manual Attendee Lookup</h3>
          <p className="text-xs text-gray-400">
            Search registered students by name or email for manual gate verification.
          </p>
        </div>

        {/* Search Input Bar */}
        <form onSubmit={handleSearchSubmit} className="w-full sm:w-auto flex gap-2">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search name or email..."
            className="w-full sm:w-64 bg-gray-800 border border-gray-700 text-gray-100 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-lg transition-colors"
          >
            Search
          </button>
        </form>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`mb-4 p-3 rounded-lg text-xs font-medium ${
            feedback.type === 'success'
              ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-500/30'
              : 'bg-rose-950/60 text-rose-300 border border-rose-500/30'
          }`}
        >
          {feedback.message}
        </div>
      )}

      {/* Attendees Table / List */}
      {isLoading ? (
        <div className="py-12 text-center text-sm text-gray-400">Loading registered attendees...</div>
      ) : attendees.length === 0 ? (
        <div className="py-12 text-center text-sm text-gray-400">
          No registered attendees found matching your search.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-xs text-gray-400 uppercase">
                <th className="py-3 px-3">Student</th>
                <th className="py-3 px-3">Email</th>
                <th className="py-3 px-3">Ticket</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/60">
              {attendees.map((item) => {
                const s = item.student;
                const checkedIn = item.isCheckedIn;
                const att = item.attendance;
                const isOperating = actionLoadingId === s._id;

                return (
                  <tr key={item.registrationId || s._id} className="hover:bg-gray-800/40">
                    <td className="py-3 px-3">
                      <div className="font-medium text-gray-100">{s.name}</div>
                      {!s.isActive && (
                        <span className="text-[10px] text-rose-400 font-semibold uppercase">Deactivated</span>
                      )}
                    </td>
                    <td className="py-3 px-3 font-mono text-xs text-gray-300">{s.email}</td>
                    <td className="py-3 px-3">
                      {item.ticket ? (
                        <span
                          className={`text-xs px-2 py-0.5 rounded font-mono ${
                            item.ticket.status === 'active'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                              : item.ticket.status === 'used'
                              ? 'bg-blue-500/10 text-blue-400 border border-blue-500/30'
                              : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                          }`}
                        >
                          {item.ticket.status}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-500">None</span>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      {checkedIn ? (
                        <div className="flex flex-col">
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-400">
                            <span className="w-2 h-2 rounded-full bg-emerald-400" />
                            Checked In
                          </span>
                          <span className="text-[10px] text-gray-400">
                            {att?.checkedInAt
                              ? new Date(att.checkedInAt).toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })
                              : ''}{' '}
                            ({att?.method})
                          </span>
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-gray-400">
                          <span className="w-2 h-2 rounded-full bg-gray-600" />
                          Not Checked In
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {!checkedIn ? (
                          <button
                            type="button"
                            disabled={isOperating || !s.isActive || item.ticket?.status !== 'active'}
                            onClick={() => handleManualCheckIn(s._id)}
                            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-xs font-medium text-white transition-colors"
                          >
                            {isOperating ? 'Processing...' : 'Check In'}
                          </button>
                        ) : (
                          <span className="text-xs text-gray-500 italic">Complete</span>
                        )}

                        {/* Admin Override Action */}
                        {isAdmin && !checkedIn && (
                          <button
                            type="button"
                            onClick={() => handleOpenOverride(s)}
                            className="px-2.5 py-1.5 rounded-lg bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/30 text-xs font-medium transition-colors"
                            title="Force attendance recording with reason"
                          >
                            Override
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Admin Override Modal */}
      {overrideModalOpen && selectedStudentForOverride && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-gray-900 border border-amber-500/50 rounded-2xl p-6 shadow-2xl">
            <h4 className="text-lg font-bold text-amber-300 mb-2">Admin Attendance Override</h4>
            <p className="text-xs text-gray-300 mb-4">
              Overriding check-in for <span className="font-semibold text-white">{selectedStudentForOverride.name}</span>.
              Please provide an explanatory reason for the audit log.
            </p>

            <form onSubmit={handleConfirmOverride}>
              <div className="mb-4">
                <label className="block text-xs font-medium text-gray-400 mb-1">
                  Reason for Override <span className="text-rose-400">*</span>:
                </label>
                <textarea
                  rows={3}
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  placeholder="e.g. Phone damaged, verified physical college identity card."
                  required
                  minLength={3}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2.5 text-xs text-gray-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setOverrideModalOpen(false)}
                  disabled={overrideSubmitting}
                  className="px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-xs text-gray-300 font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={overrideSubmitting || !overrideReason.trim()}
                  className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-xs text-black font-semibold transition-colors"
                >
                  {overrideSubmitting ? 'Recording...' : 'Confirm Override'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
