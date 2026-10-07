import React from 'react';

export default function ScanResultOverlay({ result, onDismiss }) {
  if (!result) return null;

  const { status, message, data, error } = result;

  const isSuccess = status === 'success';
  const isDuplicate = status === 'duplicate' || error?.code === 'ALREADY_CHECKED_IN';
  const isError = !isSuccess && !isDuplicate;

  const existingAttendance = error?.details?.existingAttendance;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
      <div
        className={`w-full max-w-md rounded-2xl shadow-2xl p-6 text-center transform transition-all border ${
          isSuccess
            ? 'bg-emerald-950/90 border-emerald-500/50 text-white'
            : isDuplicate
            ? 'bg-amber-950/90 border-amber-500/50 text-white'
            : 'bg-rose-950/90 border-rose-500/50 text-white'
        }`}
      >
        {/* Status Icon */}
        <div className="flex justify-center mb-4">
          {isSuccess && (
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center text-emerald-400">
              <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
              </svg>
            </div>
          )}
          {isDuplicate && (
            <div className="w-16 h-16 rounded-full bg-amber-500/20 border-2 border-amber-400 flex items-center justify-center text-amber-400">
              <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
          )}
          {isError && (
            <div className="w-16 h-16 rounded-full bg-rose-500/20 border-2 border-rose-400 flex items-center justify-center text-rose-400">
              <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
          )}
        </div>

        {/* Status Title */}
        <h3 className="text-2xl font-bold mb-2">
          {isSuccess && 'Check-In Successful!'}
          {isDuplicate && 'Already Checked In'}
          {isError && 'Check-In Rejected'}
        </h3>

        {/* Status Description / Details */}
        <p className="text-sm text-gray-200 mb-4">{message}</p>

        {isSuccess && data && (
          <div className="bg-black/40 rounded-xl p-4 mb-5 text-left border border-emerald-500/30 space-y-2 text-sm">
            <div className="flex justify-between items-center pb-2 border-b border-emerald-500/20">
              <span className="text-gray-400">Attendee:</span>
              <span className="font-semibold text-emerald-300">{data.student?.name}</span>
            </div>
            <div className="flex justify-between items-center pb-2 border-b border-emerald-500/20">
              <span className="text-gray-400">Email:</span>
              <span className="text-gray-200 font-mono text-xs">{data.student?.email}</span>
            </div>
            <div className="flex justify-between items-center pb-2 border-b border-emerald-500/20">
              <span className="text-gray-400">Method:</span>
              <span className="uppercase text-xs font-semibold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                {data.attendance?.method}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Time:</span>
              <span className="text-xs text-gray-300">
                {data.attendance?.checkedInAt
                  ? new Date(data.attendance.checkedInAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                  : 'Just now'}
              </span>
            </div>
          </div>
        )}

        {isDuplicate && existingAttendance && (
          <div className="bg-black/40 rounded-xl p-4 mb-5 text-left border border-amber-500/30 space-y-2 text-sm">
            <div className="flex justify-between items-center pb-2 border-b border-amber-500/20">
              <span className="text-gray-400">Checked In At:</span>
              <span className="font-medium text-amber-300">
                {new Date(existingAttendance.checkedInAt).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                })}
              </span>
            </div>
            {existingAttendance.checkedInBy && (
              <div className="flex justify-between items-center pb-2 border-b border-amber-500/20">
                <span className="text-gray-400">Checked In By:</span>
                <span className="text-gray-200">
                  {existingAttendance.checkedInBy.name || existingAttendance.checkedInBy.email || 'Staff'}
                </span>
              </div>
            )}
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Method:</span>
              <span className="uppercase text-xs font-semibold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300">
                {existingAttendance.method}
              </span>
            </div>
          </div>
        )}

        {isError && error && (
          <div className="bg-black/40 rounded-xl p-4 mb-5 text-left border border-rose-500/30 space-y-2 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Error Code:</span>
              <span className="font-mono text-rose-400">{error.code || 'UNKNOWN_ERROR'}</span>
            </div>
          </div>
        )}

        {/* Action Button */}
        <button
          onClick={onDismiss}
          className={`w-full py-3 px-4 rounded-xl font-semibold shadow-lg transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 ${
            isSuccess
              ? 'bg-emerald-500 hover:bg-emerald-600 text-black focus:ring-emerald-400'
              : isDuplicate
              ? 'bg-amber-500 hover:bg-amber-600 text-black focus:ring-amber-400'
              : 'bg-rose-500 hover:bg-rose-600 text-white focus:ring-rose-400'
          }`}
        >
          {isSuccess ? 'Scan Next Attendee' : 'Dismiss & Continue'}
        </button>
      </div>
    </div>
  );
}
