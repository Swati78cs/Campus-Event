import React, { useState, useEffect } from 'react';
import {
  Users,
  UserPlus,
  Trash2,
  Search,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  X,
} from 'lucide-react';
import {
  getEventVolunteers,
  assignVolunteer,
  removeVolunteer,
  searchEligibleUsers,
} from '../../services/volunteerService';
import { formatToIST } from '../../utils/dateUtils';

export default function VolunteerManager({ eventId }) {
  const [volunteers, setVolunteers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionSuccess, setActionSuccess] = useState(null);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [assigningId, setAssigningId] = useState(null);
  const [removingId, setRemovingId] = useState(null);

  const fetchVolunteers = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getEventVolunteers(eventId, 'active');
      setVolunteers(res.data?.volunteers || []);
    } catch (err) {
      console.error('Failed to load event volunteers:', err);
      setError(err.response?.data?.message || 'Failed to load volunteers for this event.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (eventId) {
      fetchVolunteers();
    }
  }, [eventId]);

  const handleSearch = async (e) => {
    e?.preventDefault();
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      setSearching(true);
      const res = await searchEligibleUsers(searchQuery.trim(), 10);
      setSearchResults(res.data?.users || []);
    } catch (err) {
      console.error('Search failed:', err);
    } finally {
      setSearching(false);
    }
  };

  const handleAssign = async (userId) => {
    try {
      setAssigningId(userId);
      setError(null);
      setActionSuccess(null);
      await assignVolunteer(eventId, userId);
      setActionSuccess('Volunteer assigned successfully.');
      setSearchQuery('');
      setSearchResults([]);
      await fetchVolunteers();
    } catch (err) {
      console.error('Assignment failed:', err);
      setError(err.response?.data?.message || 'Failed to assign volunteer.');
    } finally {
      setAssigningId(null);
    }
  };

  const handleRemove = async (userId, userName) => {
    if (!window.confirm(`Are you sure you want to remove ${userName || 'this user'} as a volunteer for this event?`)) {
      return;
    }

    try {
      setRemovingId(userId);
      setError(null);
      setActionSuccess(null);
      await removeVolunteer(eventId, userId);
      setActionSuccess('Volunteer removed successfully.');
      await fetchVolunteers();
    } catch (err) {
      console.error('Removal failed:', err);
      setError(err.response?.data?.message || 'Failed to remove volunteer.');
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <ShieldCheck size={20} color="var(--color-navy)" />
          <h2 style={{ fontSize: '18px', margin: 0 }}>Event Volunteers ({volunteers.length})</h2>
        </div>

        <span className="badge" style={{ backgroundColor: '#DBEAFE', color: '#1E40AF', fontWeight: 600 }}>
          Event-Scoped Access
        </span>
      </div>

      {/* Success notification */}
      {actionSuccess && (
        <div
          style={{
            padding: '10px 14px',
            backgroundColor: '#ECFDF5',
            border: '1px solid #A7F3D0',
            borderRadius: 'var(--radius-sm)',
            color: '#065F46',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '13px',
          }}
        >
          <CheckCircle2 size={16} />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Error notification */}
      {error && (
        <div
          style={{
            padding: '10px 14px',
            backgroundColor: '#FEE2E2',
            border: '1px solid #FECACA',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--color-error)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '13px',
          }}
        >
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* Assign Volunteer Search Bar */}
      <div style={{ backgroundColor: '#F8FAFC', padding: 'var(--space-4)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }}>
        <h3 style={{ fontSize: '14px', margin: '0 0 var(--space-2) 0', color: 'var(--color-navy)' }}>
          Assign Active User as Volunteer
        </h3>
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '220px', position: 'relative' }}>
            <input
              type="text"
              placeholder="Search by student/organizer name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--color-border)',
                fontSize: '14px',
              }}
            />
          </div>
          <button
            type="submit"
            disabled={searching || !searchQuery.trim()}
            className="btn btn-secondary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', minHeight: '38px' }}
          >
            <Search size={14} />
            <span>{searching ? 'Searching...' : 'Search'}</span>
          </button>
        </form>

        {/* Search Results Dropdown List */}
        {searchResults.length > 0 && (
          <div
            style={{
              marginTop: 'var(--space-3)',
              backgroundColor: '#FFFFFF',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-sm)',
              maxHeight: '220px',
              overflowY: 'auto',
            }}
          >
            <div style={{ padding: '8px 12px', backgroundColor: '#F1F5F9', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Matching Active Users</span>
              <button
                type="button"
                onClick={() => setSearchResults([])}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
              >
                <X size={14} />
              </button>
            </div>

            {searchResults.map((usr) => {
              const isAlreadyAssigned = volunteers.some(
                (v) => (v.user?._id || v.user) === usr._id
              );

              return (
                <div
                  key={usr._id}
                  style={{
                    padding: '8px 12px',
                    borderBottom: '1px solid var(--color-border)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 'var(--space-2)',
                  }}
                >
                  <div>
                    <strong style={{ fontSize: '13px' }}>{usr.name}</strong>
                    <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginLeft: '8px' }}>
                      {usr.email}
                    </span>
                    <span className="badge" style={{ marginLeft: '8px', fontSize: '10px', textTransform: 'uppercase' }}>
                      {usr.role}
                    </span>
                  </div>

                  {isAlreadyAssigned ? (
                    <span style={{ fontSize: '12px', color: 'var(--color-success)', fontWeight: 600 }}>
                      Already Assigned
                    </span>
                  ) : (
                    <button
                      type="button"
                      disabled={assigningId === usr._id}
                      onClick={() => handleAssign(usr._id)}
                      className="btn btn-primary"
                      style={{ fontSize: '12px', padding: '4px 10px', minHeight: '32px' }}
                    >
                      {assigningId === usr._id ? 'Assigning...' : 'Assign'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Current Volunteers Table */}
      {loading ? (
        <p style={{ color: 'var(--color-text-secondary)', textAlign: 'center', padding: 'var(--space-4)' }}>
          Loading event volunteers...
        </p>
      ) : volunteers.length === 0 ? (
        <p style={{ color: 'var(--color-text-secondary)', textAlign: 'center', padding: 'var(--space-4)' }}>
          No volunteers have been assigned to this event yet. Use the search box above to assign volunteers.
        </p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--color-border)', color: 'var(--color-text-secondary)' }}>
                <th style={{ padding: '10px 14px' }}>Volunteer Name</th>
                <th style={{ padding: '10px 14px' }}>Email</th>
                <th style={{ padding: '10px 14px' }}>Account Role</th>
                <th style={{ padding: '10px 14px' }}>Assigned Date</th>
                <th style={{ padding: '10px 14px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {volunteers.map((asgn) => {
                const u = asgn.user;
                return (
                  <tr key={asgn._id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: '10px 14px', fontWeight: 600 }}>{u?.name || 'Unknown'}</td>
                    <td style={{ padding: '10px 14px' }}>{u?.email || 'N/A'}</td>
                    <td style={{ padding: '10px 14px' }}>
                      <span className="badge" style={{ fontSize: '11px', textTransform: 'uppercase' }}>
                        {u?.role || 'user'}
                      </span>
                    </td>
                    <td style={{ padding: '10px 14px', color: 'var(--color-text-secondary)' }}>
                      {formatToIST(asgn.assignedAt)}
                    </td>
                    <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                      <button
                        type="button"
                        disabled={removingId === u?._id}
                        onClick={() => handleRemove(u?._id, u?.name)}
                        style={{
                          backgroundColor: 'transparent',
                          border: '1px solid var(--color-error)',
                          color: 'var(--color-error)',
                          padding: '4px 10px',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: '12px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <Trash2 size={12} />
                        <span>{removingId === u?._id ? 'Removing...' : 'Remove'}</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
