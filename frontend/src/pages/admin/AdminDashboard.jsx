import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { adminGetUsers, adminUpdateUserStatus } from '../../services/authService';
import { adminUpdateUserRole } from '../../services/clubService';
import AdminAnalytics from '../../components/analytics/AdminAnalytics';
import { ShieldCheck, Users, ToggleLeft, ToggleRight, AlertCircle, CheckCircle2, Layers, UserCheck, Calendar } from 'lucide-react';

export default function AdminDashboard() {
  const { user: currentAdmin } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionSuccess, setActionSuccess] = useState(null);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await adminGetUsers();
      setUsers(response.data?.users || []);
    } catch (err) {
      setError(err.message || 'Failed to load user records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleToggleStatus = async (userToToggle) => {
    if (userToToggle._id === currentAdmin._id) {
      setError('You cannot deactivate your own administrative account.');
      return;
    }

    setActionLoadingId(userToToggle._id);
    setError(null);
    setActionSuccess(null);

    const nextStatus = !userToToggle.isActive;

    try {
      const response = await adminUpdateUserStatus(userToToggle._id, nextStatus);
      const updatedUser = response.data?.user;

      setUsers((prev) =>
        prev.map((u) => (u._id === updatedUser._id ? updatedUser : u))
      );

      setActionSuccess(
        `User ${updatedUser.name} has been ${updatedUser.isActive ? 'activated' : 'deactivated'}.`
      );
    } catch (err) {
      setError(err.message || 'Failed to update user status.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRoleChange = async (targetUser, newRole) => {
    if (targetUser._id === currentAdmin._id) {
      setError('You cannot change your own administrator role.');
      return;
    }

    setActionLoadingId(targetUser._id);
    setError(null);
    setActionSuccess(null);

    try {
      const response = await adminUpdateUserRole(targetUser._id, newRole);
      const updatedUser = response.data?.user;

      setUsers((prev) =>
        prev.map((u) => (u._id === updatedUser._id ? { ...u, role: updatedUser.role } : u))
      );

      setActionSuccess(`Role for ${targetUser.name} updated to ${newRole.toUpperCase()}.`);
    } catch (err) {
      setError(err.message || 'Failed to update user role.');
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      {/* Header and Quick Navigation */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-4)' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <ShieldCheck size={28} color="var(--color-primary)" />
            <h1>Admin Dashboard</h1>
          </div>
          <p style={{ marginTop: 'var(--space-2)' }}>
            Welcome, <strong>{currentAdmin?.name}</strong>. Manage campus clubs, user roles, and account access.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          <Link
            to="/admin/events"
            className="btn btn-secondary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-2)' }}
          >
            <Calendar size={18} />
            <span>All Events</span>
          </Link>
          <Link
            to="/admin/clubs"
            className="btn btn-primary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-2)' }}
          >
            <Layers size={18} />
            <span>Manage Clubs</span>
          </Link>
        </div>
      </div>

      {actionSuccess && (
        <div
          style={{
            padding: 'var(--space-3) var(--space-4)',
            backgroundColor: '#DCFCE7',
            borderRadius: 'var(--radius-sm)',
            color: '#166534',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-2)',
            fontSize: '14px',
          }}
        >
          <CheckCircle2 size={18} />
          <span>{actionSuccess}</span>
        </div>
      )}

      {error && (
        <div
          style={{
            padding: 'var(--space-3) var(--space-4)',
            backgroundColor: '#FEE2E2',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--color-error)',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-2)',
            fontSize: '14px',
          }}
        >
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Platform Analytics Overview */}
      <AdminAnalytics />

      {/* Account Activation & Role Management Card */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <Users size={20} color="var(--color-navy)" />
            <h2 style={{ fontSize: '18px' }}>User Accounts, Roles &amp; Activation Management</h2>
          </div>
          <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>
            Total Users: {users.length}
          </span>
        </div>

        {loading ? (
          <p style={{ padding: 'var(--space-4)', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
            Loading users...
          </p>
        ) : users.length === 0 ? (
          <p style={{ padding: 'var(--space-4)', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
            No registered users found.
          </p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--color-border)', color: 'var(--color-text-secondary)' }}>
                  <th style={{ padding: '12px 16px' }}>Name</th>
                  <th style={{ padding: '12px 16px' }}>Email</th>
                  <th style={{ padding: '12px 16px' }}>Role</th>
                  <th style={{ padding: '12px 16px' }}>Status</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => {
                  const isSelf = u._id === currentAdmin?._id;
                  const isProcessing = actionLoadingId === u._id;

                  return (
                    <tr
                      key={u._id}
                      style={{
                        borderBottom: '1px solid var(--color-border)',
                        backgroundColor: u.isActive ? 'transparent' : '#FFF1F2',
                      }}
                    >
                      <td style={{ padding: '12px 16px', fontWeight: 600 }}>{u.name}</td>
                      <td style={{ padding: '12px 16px' }}>{u.email}</td>
                      <td style={{ padding: '12px 16px' }}>
                        {isSelf ? (
                          <span
                            className="badge"
                            style={{
                              backgroundColor: '#FEF3C7',
                              color: '#92400E',
                              textTransform: 'uppercase',
                              fontSize: '11px',
                            }}
                          >
                            ADMIN (YOU)
                          </span>
                        ) : (
                          <select
                            value={u.role}
                            disabled={isProcessing}
                            onChange={(e) => handleRoleChange(u, e.target.value)}
                            style={{
                              padding: '4px 8px',
                              borderRadius: 'var(--radius-sm)',
                              border: '1px solid var(--color-border)',
                              fontSize: '12px',
                              fontWeight: 600,
                              cursor: 'pointer',
                              backgroundColor:
                                u.role === 'admin' ? '#FEF3C7' : u.role === 'organizer' ? '#EDE9FE' : '#DBEAFE',
                              color:
                                u.role === 'admin' ? '#92400E' : u.role === 'organizer' ? '#6D28D9' : '#1E40AF',
                            }}
                          >
                            <option value="student">STUDENT</option>
                            <option value="organizer">ORGANIZER</option>
                            <option value="admin">ADMIN</option>
                          </select>
                        )}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span className={`badge ${u.isActive ? 'badge-success' : 'badge-error'}`}>
                          {u.isActive ? 'Active' : 'Deactivated'}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                        {isSelf ? (
                          <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                            Active Admin
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(u)}
                            disabled={isProcessing}
                            className={`btn ${u.isActive ? 'btn-secondary' : 'btn-primary'}`}
                            style={{
                              padding: '6px 12px',
                              fontSize: '13px',
                              minHeight: '36px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 'var(--space-1)',
                            }}
                          >
                            {u.isActive ? (
                              <>
                                <ToggleRight size={16} color="var(--color-error)" />
                                <span>Deactivate</span>
                              </>
                            ) : (
                              <>
                                <ToggleLeft size={16} />
                                <span>Activate</span>
                              </>
                            )}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
