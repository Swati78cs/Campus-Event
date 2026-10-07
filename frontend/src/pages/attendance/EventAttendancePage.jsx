import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getPublicEvent } from '../../services/eventService';
import {
  checkInByQr,
  getAttendanceStats,
  getEventAttendance,
} from '../../services/attendanceService';
import { useAuth } from '../../context/AuthContext';
import QRScanner from '../../components/attendance/QRScanner';
import ScanResultOverlay from '../../components/attendance/ScanResultOverlay';
import ManualAttendeeSearch from '../../components/attendance/ManualAttendeeSearch';

export default function EventAttendancePage() {
  const { eventId } = useParams();
  const { user } = useAuth();

  const [event, setEvent] = useState(null);
  const [stats, setStats] = useState(null);
  const [activeTab, setActiveTab] = useState('scanner'); // 'scanner' | 'manual' | 'log'
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // QR Scan Result State
  const [scanResult, setScanResult] = useState(null);
  const [isScannerPaused, setIsScannerPaused] = useState(false);

  // Attendance Log State
  const [logRecords, setLogRecords] = useState([]);
  const [logPagination, setLogPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [logMethodFilter, setLogMethodFilter] = useState('');
  const [logLoading, setLogLoading] = useState(false);

  useEffect(() => {
    loadPageData();
  }, [eventId]);

  useEffect(() => {
    if (activeTab === 'log') {
      loadAttendanceLog(1, logMethodFilter);
    }
  }, [activeTab, logMethodFilter]);

  const loadPageData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const [eventRes, statsRes] = await Promise.all([
        getPublicEvent(eventId),
        getAttendanceStats(eventId).catch((e) => {
          console.warn('Stats fetch warning:', e);
          return null;
        }),
      ]);

      if (eventRes?.success && eventRes?.data?.event) {
        setEvent(eventRes.data.event);
      } else {
        setError('Event not found or access denied.');
      }

      if (statsRes?.success && statsRes?.data) {
        setStats(statsRes.data);
      }
    } catch (err) {
      setError(err.message || 'Failed to load event attendance details.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefreshStats = async () => {
    try {
      setIsRefreshing(true);
      const statsRes = await getAttendanceStats(eventId);
      if (statsRes?.success && statsRes?.data) {
        setStats(statsRes.data);
      }
      if (activeTab === 'log') {
        await loadAttendanceLog(logPagination.page, logMethodFilter);
      }
    } catch (err) {
      console.warn('Refresh error:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  const loadAttendanceLog = async (page = 1, method = '') => {
    try {
      setLogLoading(true);
      const res = await getEventAttendance(eventId, {
        page,
        limit: 20,
        ...(method ? { method } : {}),
      });
      if (res?.success && res?.data) {
        setLogRecords(res.data.records || []);
        if (res.data.pagination) setLogPagination(res.data.pagination);
      }
    } catch (err) {
      console.warn('Error loading attendance log:', err);
    } finally {
      setLogLoading(false);
    }
  };

  const handleQrScan = async (token) => {
    setIsScannerPaused(true);
    try {
      const res = await checkInByQr(eventId, token);
      if (res?.success) {
        setScanResult({
          status: 'success',
          message: 'Student check-in successfully confirmed!',
          data: res.data,
        });
        handleRefreshStats();
      }
    } catch (err) {
      const isDuplicate = err.code === 'ALREADY_CHECKED_IN' || err.statusCode === 400 && err.message?.includes('already');
      setScanResult({
        status: isDuplicate ? 'duplicate' : 'error',
        message: err.message || 'Check-in failed.',
        error: err,
      });
    }
  };

  const handleDismissScanResult = () => {
    setScanResult(null);
    setIsScannerPaused(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-950 text-gray-100 flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-400">Loading Attendance & Check-In...</p>
        </div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="min-h-screen bg-gray-950 text-gray-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-gray-900 border border-rose-500/30 rounded-2xl p-6 text-center shadow-xl">
          <div className="w-12 h-12 rounded-full bg-rose-500/20 text-rose-400 mx-auto flex items-center justify-center mb-3">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-lg font-bold text-white mb-2">Access Denied or Error</h2>
          <p className="text-sm text-gray-300 mb-5">{error || 'Event could not be loaded.'}</p>
          <Link
            to="/volunteers/my-events"
            className="inline-block px-4 py-2 bg-gray-800 hover:bg-gray-700 text-sm text-gray-200 rounded-lg transition-colors"
          >
            Back to Volunteer Events
          </Link>
        </div>
      </div>
    );
  }

  // Check-in window computation
  const now = new Date();
  const start = new Date(event.startDateTime);
  const end = new Date(event.endDateTime);
  const isBefore = now < start;
  const isAfter = now > end;
  const isLive = !isBefore && !isAfter;

  const totalRegistered = stats?.totalRegistered ?? event.registeredCount ?? 0;
  const totalCheckedIn = stats?.totalCheckedIn ?? 0;
  const checkInRate = stats?.checkInRate ?? (totalRegistered > 0 ? ((totalCheckedIn / totalRegistered) * 100).toFixed(1) : 0);

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between text-xs text-gray-400">
          <div className="flex items-center gap-2">
            <Link to="/volunteers/my-events" className="hover:text-emerald-400 transition-colors">
              Assigned Events
            </Link>
            <span>/</span>
            <Link to={`/events/${eventId}`} className="hover:text-emerald-400 transition-colors truncate max-w-[200px]">
              {event.title}
            </Link>
            <span>/</span>
            <span className="text-gray-200 font-semibold">Attendance & Check-In</span>
          </div>

          <Link
            to={`/events/${eventId}`}
            className="text-xs text-emerald-400 hover:underline flex items-center gap-1"
          >
            View Event Details &rarr;
          </Link>
        </div>

        {/* Event Header Banner */}
        <div className="bg-gradient-to-r from-gray-900 via-gray-900 to-gray-850 border border-gray-800 rounded-2xl p-6 shadow-xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  {event.category}
                </span>
                {isLive && (
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 animate-pulse">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    Live Check-In Active
                  </span>
                )}
                {isBefore && (
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                    <span className="w-2 h-2 rounded-full bg-amber-400" />
                    Starts Soon (Check-In Not Started)
                  </span>
                )}
                {isAfter && (
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40">
                    <span className="w-2 h-2 rounded-full bg-rose-400" />
                    Event Ended (Check-In Closed)
                  </span>
                )}
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white">{event.title}</h1>
              <p className="text-xs sm:text-sm text-gray-400 mt-1 flex flex-wrap items-center gap-x-4 gap-y-1">
                <span>📍 {event.venue}</span>
                <span>
                  🕒 {start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} -{' '}
                  {end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
                <span>📅 {start.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}</span>
              </p>
            </div>

            {/* Manual Refresh Button */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleRefreshStats}
                disabled={isRefreshing}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-semibold border border-gray-700 transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                title="Refresh live attendance statistics"
              >
                <svg
                  className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-emerald-400' : 'text-gray-400'}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                {isRefreshing ? 'Refreshing...' : 'Refresh'}
              </button>
            </div>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-gray-800/80">
            <div className="bg-gray-800/40 rounded-xl p-3 border border-gray-800">
              <div className="text-xs text-gray-400">Total Registered</div>
              <div className="text-2xl font-bold text-white mt-0.5">{totalRegistered}</div>
            </div>
            <div className="bg-gray-800/40 rounded-xl p-3 border border-gray-800">
              <div className="text-xs text-gray-400">Checked In</div>
              <div className="text-2xl font-bold text-emerald-400 mt-0.5">{totalCheckedIn}</div>
            </div>
            <div className="bg-gray-800/40 rounded-xl p-3 border border-gray-800">
              <div className="text-xs text-gray-400">Check-In Rate</div>
              <div className="text-2xl font-bold text-teal-400 mt-0.5">{checkInRate}%</div>
              <div className="w-full bg-gray-700 h-1 rounded-full mt-1.5 overflow-hidden">
                <div
                  className="bg-emerald-500 h-full transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.max(0, checkInRate))}%` }}
                />
              </div>
            </div>
            <div className="bg-gray-800/40 rounded-xl p-3 border border-gray-800 flex flex-col justify-center text-xs text-gray-300">
              <div className="text-[11px] text-gray-400 mb-1">By Method:</div>
              <div className="flex items-center gap-2 text-[11px]">
                <span className="text-emerald-400">QR: {stats?.byMethod?.qr || 0}</span>
                <span className="text-gray-500">•</span>
                <span className="text-blue-400">Manual: {stats?.byMethod?.manual || 0}</span>
                <span className="text-gray-500">•</span>
                <span className="text-amber-400">Override: {stats?.byMethod?.admin_override || 0}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-gray-800">
          <button
            type="button"
            onClick={() => setActiveTab('scanner')}
            className={`py-3 px-5 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'scanner'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <span>📷</span> QR Scanner
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('manual')}
            className={`py-3 px-5 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'manual'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <span>🔍</span> Manual Lookup
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('log')}
            className={`py-3 px-5 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'log'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <span>📋</span> Attendance Log ({totalCheckedIn})
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'scanner' && (
          <div className="max-w-xl mx-auto">
            <QRScanner onScan={handleQrScan} isPaused={isScannerPaused} />
          </div>
        )}

        {activeTab === 'manual' && (
          <ManualAttendeeSearch eventId={eventId} onCheckInSuccess={handleRefreshStats} />
        )}

        {activeTab === 'log' && (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 sm:p-6 shadow-xl">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
              <div>
                <h3 className="text-lg font-semibold text-white">Attendance Audit Log</h3>
                <p className="text-xs text-gray-400">
                  Full list of checked-in attendees and verifying staff members.
                </p>
              </div>

              {/* Filter by Method */}
              <div className="flex items-center gap-2">
                <label className="text-xs text-gray-400">Method:</label>
                <select
                  value={logMethodFilter}
                  onChange={(e) => setLogMethodFilter(e.target.value)}
                  className="bg-gray-800 border border-gray-700 text-gray-200 text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">All Methods</option>
                  <option value="qr">QR Code</option>
                  <option value="manual">Manual</option>
                  <option value="admin_override">Admin Override</option>
                </select>
              </div>
            </div>

            {logLoading ? (
              <div className="py-12 text-center text-sm text-gray-400">Loading attendance records...</div>
            ) : logRecords.length === 0 ? (
              <div className="py-12 text-center text-sm text-gray-400">
                No attendance records recorded yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-gray-800 text-xs text-gray-400 uppercase">
                      <th className="py-3 px-3">Attendee</th>
                      <th className="py-3 px-3">Checked In At</th>
                      <th className="py-3 px-3">Method</th>
                      <th className="py-3 px-3">Staff / Verifier</th>
                      <th className="py-3 px-3">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800/60">
                    {logRecords.map((item) => (
                      <tr key={item._id} className="hover:bg-gray-800/40">
                        <td className="py-3 px-3">
                          <div className="font-medium text-gray-100">{item.student?.name || 'Student'}</div>
                          <div className="text-xs font-mono text-gray-400">{item.student?.email}</div>
                        </td>
                        <td className="py-3 px-3 text-xs text-gray-300">
                          {new Date(item.checkedInAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                          })}
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`text-xs px-2 py-0.5 rounded font-semibold uppercase ${
                              item.method === 'qr'
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                                : item.method === 'manual'
                                ? 'bg-blue-500/10 text-blue-400 border border-blue-500/30'
                                : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                            }`}
                          >
                            {item.method}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-xs text-gray-300">
                          {item.checkedInBy?.name || item.checkedInBy?.email || 'Staff'}
                        </td>
                        <td className="py-3 px-3 text-xs text-gray-400">
                          {item.overrideReason ? (
                            <span className="italic text-amber-300/90">{item.overrideReason}</span>
                          ) : (
                            '—'
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Scan Result Overlay Modal */}
        <ScanResultOverlay result={scanResult} onDismiss={handleDismissScanResult} />
      </div>
    </div>
  );
}
