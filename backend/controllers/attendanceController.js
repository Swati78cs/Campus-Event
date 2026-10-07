const attendanceService = require('../services/attendanceService');

/**
 * POST /api/events/:eventId/attendance/qr
 * Check in an attendee via scanned QR ticket token.
 */
const checkInByQr = async (req, res, next) => {
  try {
    const { eventId } = req.params;
    const { token } = req.body;
    const result = await attendanceService.checkInByQr(eventId, token, req.user);
    res.status(200).json({
      success: true,
      message: 'Check-in successful',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/events/:eventId/attendance/manual
 * Manually check in an attendee by Student ID.
 */
const checkInManual = async (req, res, next) => {
  try {
    const { eventId } = req.params;
    const { studentId } = req.body;
    const result = await attendanceService.checkInManual(eventId, studentId, req.user);
    res.status(200).json({
      success: true,
      message: 'Manual check-in successful',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/events/:eventId/attendance/:studentId/override
 * Admin override to record attendance with explanation.
 */
const overrideAttendance = async (req, res, next) => {
  try {
    const { eventId, studentId } = req.params;
    const { overrideReason } = req.body;
    const result = await attendanceService.overrideAttendance(
      eventId,
      studentId,
      overrideReason,
      req.user
    );
    res.status(200).json({
      success: true,
      message: 'Attendance recorded via admin override',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/events/:eventId/attendance
 * Retrieve event attendance records with pagination and filters.
 */
const getEventAttendance = async (req, res, next) => {
  try {
    const { eventId } = req.params;
    const result = await attendanceService.getEventAttendance(eventId, req.user, req.query);
    res.status(200).json({
      success: true,
      message: 'Attendance records retrieved successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/events/:eventId/attendance/stats
 * Retrieve event attendance statistics and check-in rates.
 */
const getAttendanceStats = async (req, res, next) => {
  try {
    const { eventId } = req.params;
    const result = await attendanceService.getAttendanceStats(eventId, req.user);
    res.status(200).json({
      success: true,
      message: 'Attendance stats retrieved successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/events/:eventId/attendance/search
 * Search registered attendees for manual check-in.
 */
const searchAttendees = async (req, res, next) => {
  try {
    const { eventId } = req.params;
    const attendees = await attendanceService.searchRegisteredAttendees(
      eventId,
      req.user,
      req.query
    );
    res.status(200).json({
      success: true,
      message: 'Attendees retrieved successfully',
      data: { attendees },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  checkInByQr,
  checkInManual,
  overrideAttendance,
  getEventAttendance,
  getAttendanceStats,
  searchAttendees,
};
