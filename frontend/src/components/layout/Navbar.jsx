import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getMyVolunteerStatus } from '../../services/volunteerService';
import { notificationService } from '../../services/notificationService';
import { Calendar, User, LogOut, Menu, X, LayoutDashboard, Layers, Briefcase, Compass, Ticket, ShieldCheck, Bell, Award } from 'lucide-react';

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isVolunteer, setIsVolunteer] = useState(false);
  const [unreadNotifsCount, setUnreadNotifsCount] = useState(0);
  const { user, isAuthenticated, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    let isMounted = true;
    if (isAuthenticated) {
      getMyVolunteerStatus()
        .then((res) => {
          if (isMounted) {
            setIsVolunteer(Boolean(res.data?.hasActiveAssignments));
          }
        })
        .catch(() => {
          if (isMounted) setIsVolunteer(false);
        });

      notificationService
        .getUnreadCount()
        .then((count) => {
          if (isMounted) setUnreadNotifsCount(count);
        })
        .catch(() => {
          if (isMounted) setUnreadNotifsCount(0);
        });
    } else {
      setIsVolunteer(false);
      setUnreadNotifsCount(0);
    }
    return () => {
      isMounted = false;
    };
  }, [isAuthenticated, location.pathname]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  // Determine dashboard link based on role
  const dashboardPath = user?.role === 'admin'
    ? '/admin'
    : user?.role === 'organizer'
    ? '/organizer'
    : '/student';

  return (
    <header style={{ backgroundColor: 'var(--color-navy)', color: '#FFFFFF' }}>
      <div
        style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '0 var(--space-4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          height: '64px',
        }}
      >
        {/* Brand */}
        <Link
          to="/"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-2)',
            color: '#FFFFFF',
            textDecoration: 'none',
            fontWeight: 700,
            fontSize: '18px',
          }}
        >
          <Calendar size={22} color="var(--color-qr)" />
          <span>Campus Events</span>
        </Link>

        {/* Desktop Navigation */}
        <nav
          style={{
            display: 'none',
            alignItems: 'center',
            gap: 'var(--space-2)',
          }}
          className="desktop-nav"
        >
          <Link
            to="/events"
            style={{
              color: location.pathname.startsWith('/events') ? '#FFFFFF' : '#94A3B8',
              backgroundColor: location.pathname.startsWith('/events') ? 'rgba(255,255,255,0.1)' : 'transparent',
              padding: '6px 12px',
              borderRadius: 'var(--radius-sm)',
              textDecoration: 'none',
              fontSize: '14px',
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Compass size={16} />
            <span>Discover Events</span>
          </Link>

          <Link
            to="/clubs"
            style={{
              color: location.pathname === '/clubs' ? '#FFFFFF' : '#94A3B8',
              backgroundColor: location.pathname === '/clubs' ? 'rgba(255,255,255,0.1)' : 'transparent',
              padding: '6px 12px',
              borderRadius: 'var(--radius-sm)',
              textDecoration: 'none',
              fontSize: '14px',
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Layers size={16} />
            <span>Clubs</span>
          </Link>

          <Link
            to="/verify-certificate"
            style={{
              color: location.pathname === '/verify-certificate' ? '#FFFFFF' : '#94A3B8',
              backgroundColor: location.pathname === '/verify-certificate' ? 'rgba(255,255,255,0.1)' : 'transparent',
              padding: '6px 12px',
              borderRadius: 'var(--radius-sm)',
              textDecoration: 'none',
              fontSize: '14px',
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <ShieldCheck size={16} />
            <span>Verify Certificate</span>
          </Link>

          {isAuthenticated ? (
            <>
              <Link
                to={dashboardPath}
                style={{
                  color: location.pathname === dashboardPath ? '#FFFFFF' : '#94A3B8',
                  backgroundColor: location.pathname === dashboardPath ? 'var(--color-primary)' : 'transparent',
                  padding: '6px 12px',
                  borderRadius: 'var(--radius-sm)',
                  textDecoration: 'none',
                  fontSize: '14px',
                  fontWeight: 500,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <LayoutDashboard size={16} />
                <span>Dashboard</span>
              </Link>

              {user?.role === 'student' && (
                <>
                  <Link
                    to="/student/my-tickets"
                    style={{
                      color: location.pathname === '/student/my-tickets' ? '#FFFFFF' : '#94A3B8',
                      backgroundColor: location.pathname === '/student/my-tickets' ? 'var(--color-primary)' : 'transparent',
                      padding: '6px 12px',
                      borderRadius: 'var(--radius-sm)',
                      textDecoration: 'none',
                      fontSize: '14px',
                      fontWeight: 500,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <Ticket size={16} />
                    <span>My Tickets</span>
                  </Link>

                  <Link
                    to="/student/my-events"
                    style={{
                      color: location.pathname === '/student/my-events' ? '#FFFFFF' : '#94A3B8',
                      backgroundColor: location.pathname === '/student/my-events' ? 'var(--color-primary)' : 'transparent',
                      padding: '6px 12px',
                      borderRadius: 'var(--radius-sm)',
                      textDecoration: 'none',
                      fontSize: '14px',
                      fontWeight: 500,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <Calendar size={16} />
                    <span>My Events</span>
                  </Link>

                  <Link
                    to="/student/certificates"
                    style={{
                      color: location.pathname === '/student/certificates' ? '#FFFFFF' : '#94A3B8',
                      backgroundColor: location.pathname === '/student/certificates' ? 'var(--color-primary)' : 'transparent',
                      padding: '6px 12px',
                      borderRadius: 'var(--radius-sm)',
                      textDecoration: 'none',
                      fontSize: '14px',
                      fontWeight: 500,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <Award size={16} />
                    <span>My Certificates</span>
                  </Link>
                </>
              )}

              {user?.role === 'admin' && (
                <Link
                  to="/admin/clubs"
                  style={{
                    color: location.pathname === '/admin/clubs' ? '#FFFFFF' : '#94A3B8',
                    backgroundColor: location.pathname === '/admin/clubs' ? 'var(--color-primary)' : 'transparent',
                    padding: '6px 12px',
                    borderRadius: 'var(--radius-sm)',
                    textDecoration: 'none',
                    fontSize: '14px',
                    fontWeight: 500,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <Layers size={16} />
                  <span>Manage Clubs</span>
                </Link>
              )}

              {(user?.role === 'organizer' || user?.role === 'admin') && (
                <>
                  <Link
                    to="/organizer/club"
                    style={{
                      color: location.pathname === '/organizer/club' ? '#FFFFFF' : '#94A3B8',
                      backgroundColor: location.pathname === '/organizer/club' ? 'var(--color-primary)' : 'transparent',
                      padding: '6px 12px',
                      borderRadius: 'var(--radius-sm)',
                      textDecoration: 'none',
                      fontSize: '14px',
                      fontWeight: 500,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <Briefcase size={16} />
                    <span>My Clubs</span>
                  </Link>

                  <Link
                    to="/organizer/events"
                    style={{
                      color: location.pathname.startsWith('/organizer/events') ? '#FFFFFF' : '#94A3B8',
                      backgroundColor: location.pathname.startsWith('/organizer/events') ? 'var(--color-primary)' : 'transparent',
                      padding: '6px 12px',
                      borderRadius: 'var(--radius-sm)',
                      textDecoration: 'none',
                      fontSize: '14px',
                      fontWeight: 500,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <Calendar size={16} />
                    <span>Manage Events</span>
                  </Link>
                </>
              )}

              {isVolunteer && (
                <Link
                  to="/volunteer/events"
                  style={{
                    color: location.pathname === '/volunteer/events' ? '#FFFFFF' : '#94A3B8',
                    backgroundColor: location.pathname === '/volunteer/events' ? 'var(--color-primary)' : 'transparent',
                    padding: '6px 12px',
                    borderRadius: 'var(--radius-sm)',
                    textDecoration: 'none',
                    fontSize: '14px',
                    fontWeight: 500,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <ShieldCheck size={16} />
                  <span>Volunteer</span>
                </Link>
              )}

              <Link
                to="/notifications"
                title="Notifications"
                style={{
                  color: location.pathname === '/notifications' ? '#FFFFFF' : '#94A3B8',
                  backgroundColor: location.pathname === '/notifications' ? 'var(--color-primary)' : 'transparent',
                  padding: '6px 10px',
                  borderRadius: 'var(--radius-sm)',
                  textDecoration: 'none',
                  fontSize: '14px',
                  fontWeight: 500,
                  display: 'flex',
                  alignItems: 'center',
                  position: 'relative',
                  gap: '6px',
                }}
              >
                <Bell size={18} />
                {unreadNotifsCount > 0 && (
                  <span
                    style={{
                      position: 'absolute',
                      top: '-4px',
                      right: '-4px',
                      backgroundColor: '#EF4444',
                      color: '#FFFFFF',
                      fontSize: '10px',
                      fontWeight: 700,
                      padding: '1px 5px',
                      borderRadius: 'var(--radius-full)',
                      minWidth: '16px',
                      textAlign: 'center',
                      lineHeight: '14px',
                    }}
                  >
                    {unreadNotifsCount > 99 ? '99+' : unreadNotifsCount}
                  </span>
                )}
              </Link>

              <Link
                to="/profile"
                style={{
                  color: location.pathname === '/profile' ? '#FFFFFF' : '#94A3B8',
                  backgroundColor: location.pathname === '/profile' ? 'var(--color-primary)' : 'transparent',
                  padding: '6px 12px',
                  borderRadius: 'var(--radius-sm)',
                  textDecoration: 'none',
                  fontSize: '14px',
                  fontWeight: 500,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <User size={16} />
                <span>Profile</span>
              </Link>

              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginLeft: 'var(--space-2)' }}>
                <span
                  style={{
                    fontSize: '12px',
                    padding: '2px 8px',
                    borderRadius: 'var(--radius-full)',
                    backgroundColor: 'rgba(255,255,255,0.15)',
                    color: '#FFFFFF',
                    textTransform: 'uppercase',
                    fontWeight: 600,
                  }}
                >
                  {user?.role}
                </span>

                <button
                  type="button"
                  onClick={handleLogout}
                  style={{
                    backgroundColor: 'transparent',
                    border: '1px solid rgba(255,255,255,0.3)',
                    color: '#FFFFFF',
                    padding: '6px 12px',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '13px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <LogOut size={14} />
                  <span>Logout</span>
                </button>
              </div>
            </>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <Link
                to="/login"
                style={{
                  color: '#FFFFFF',
                  padding: '6px 14px',
                  textDecoration: 'none',
                  fontSize: '14px',
                  fontWeight: 500,
                }}
              >
                Sign In
              </Link>

              <Link
                to="/register"
                className="btn btn-primary"
                style={{
                  padding: '6px 14px',
                  fontSize: '14px',
                }}
              >
                Register
              </Link>
            </div>
          )}
        </nav>

        {/* Mobile Toggle Button */}
        <button
          type="button"
          aria-label="Toggle navigation"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          style={{
            background: 'none',
            border: 'none',
            color: '#FFFFFF',
            cursor: 'pointer',
            padding: 'var(--space-2)',
          }}
          className="mobile-toggle"
        >
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div
          style={{
            backgroundColor: '#0F172A',
            padding: 'var(--space-4)',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-2)',
          }}
        >
          <Link
            to="/events"
            onClick={() => setMobileMenuOpen(false)}
            style={{ color: '#FFFFFF', padding: '10px 14px', textDecoration: 'none', fontSize: '15px' }}
          >
            Discover Events
          </Link>

          <Link
            to="/clubs"
            onClick={() => setMobileMenuOpen(false)}
            style={{ color: '#FFFFFF', padding: '10px 14px', textDecoration: 'none', fontSize: '15px' }}
          >
            Clubs Directory
          </Link>

          <Link
            to="/verify-certificate"
            onClick={() => setMobileMenuOpen(false)}
            style={{ color: '#FFFFFF', padding: '10px 14px', textDecoration: 'none', fontSize: '15px' }}
          >
            Verify Certificate
          </Link>

          {isAuthenticated ? (
            <>
              <Link
                to={dashboardPath}
                onClick={() => setMobileMenuOpen(false)}
                style={{ color: '#FFFFFF', padding: '10px 14px', textDecoration: 'none', fontSize: '15px' }}
              >
                Dashboard ({user?.role})
              </Link>

              {user?.role === 'student' && (
                <>
                  <Link
                    to="/student/my-tickets"
                    onClick={() => setMobileMenuOpen(false)}
                    style={{ color: '#FFFFFF', padding: '10px 14px', textDecoration: 'none', fontSize: '15px' }}
                  >
                    My Tickets
                  </Link>
                  <Link
                    to="/student/my-events"
                    onClick={() => setMobileMenuOpen(false)}
                    style={{ color: '#FFFFFF', padding: '10px 14px', textDecoration: 'none', fontSize: '15px' }}
                  >
                    My Events
                  </Link>
                  <Link
                    to="/student/certificates"
                    onClick={() => setMobileMenuOpen(false)}
                    style={{ color: '#FFFFFF', padding: '10px 14px', textDecoration: 'none', fontSize: '15px' }}
                  >
                    My Certificates
                  </Link>
                </>
              )}

              {user?.role === 'admin' && (
                <>
                  <Link
                    to="/admin/clubs"
                    onClick={() => setMobileMenuOpen(false)}
                    style={{ color: '#FFFFFF', padding: '10px 14px', textDecoration: 'none', fontSize: '15px' }}
                  >
                    Manage Clubs
                  </Link>
                  <Link
                    to="/admin/events"
                    onClick={() => setMobileMenuOpen(false)}
                    style={{ color: '#FFFFFF', padding: '10px 14px', textDecoration: 'none', fontSize: '15px' }}
                  >
                    All Events (Admin)
                  </Link>
                </>
              )}

              {(user?.role === 'organizer' || user?.role === 'admin') && (
                <>
                  <Link
                    to="/organizer/club"
                    onClick={() => setMobileMenuOpen(false)}
                    style={{ color: '#FFFFFF', padding: '10px 14px', textDecoration: 'none', fontSize: '15px' }}
                  >
                    My Clubs
                  </Link>
                  <Link
                    to="/organizer/events"
                    onClick={() => setMobileMenuOpen(false)}
                    style={{ color: '#FFFFFF', padding: '10px 14px', textDecoration: 'none', fontSize: '15px' }}
                  >
                    Manage Events
                  </Link>
                </>
              )}

              {isVolunteer && (
                <Link
                  to="/volunteer/events"
                  onClick={() => setMobileMenuOpen(false)}
                  style={{ color: '#FFFFFF', padding: '10px 14px', textDecoration: 'none', fontSize: '15px' }}
                >
                  Volunteer (Assigned Events)
                </Link>
              )}

              <Link
                to="/notifications"
                onClick={() => setMobileMenuOpen(false)}
                style={{
                  color: '#FFFFFF',
                  padding: '10px 14px',
                  textDecoration: 'none',
                  fontSize: '15px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Bell size={18} />
                  <span>Notifications</span>
                </div>
                {unreadNotifsCount > 0 && (
                  <span
                    style={{
                      backgroundColor: '#EF4444',
                      color: '#FFFFFF',
                      fontSize: '11px',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: 'var(--radius-full)',
                    }}
                  >
                    {unreadNotifsCount}
                  </span>
                )}
              </Link>

              <Link
                to="/profile"
                onClick={() => setMobileMenuOpen(false)}
                style={{ color: '#FFFFFF', padding: '10px 14px', textDecoration: 'none', fontSize: '15px' }}
              >
                Profile ({user?.name})
              </Link>

              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  handleLogout();
                }}
                style={{
                  backgroundColor: '#DC2626',
                  color: '#FFFFFF',
                  border: 'none',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-sm)',
                  textAlign: 'left',
                  cursor: 'pointer',
                  fontSize: '15px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <LogOut size={16} />
                <span>Logout</span>
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                style={{ color: '#FFFFFF', padding: '10px 14px', textDecoration: 'none', fontSize: '15px' }}
              >
                Sign In
              </Link>
              <Link
                to="/register"
                onClick={() => setMobileMenuOpen(false)}
                style={{
                  backgroundColor: 'var(--color-primary)',
                  color: '#FFFFFF',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-sm)',
                  textDecoration: 'none',
                  fontSize: '15px',
                  textAlign: 'center',
                }}
              >
                Register
              </Link>
            </>
          )}
        </div>
      )}

      <style>{`
        @media (min-width: 768px) {
          .desktop-nav { display: flex !important; }
          .mobile-toggle { display: none !important; }
        }
      `}</style>
    </header>
  );
}
