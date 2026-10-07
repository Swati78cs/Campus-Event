import React, { useEffect, useState } from 'react';
import {
  getClubs,
  adminCreateClub,
  adminUpdateClub,
  adminAssignOrganizer,
  adminRemoveOrganizer,
} from '../../services/clubService';
import { adminGetUsers } from '../../services/authService';
import {
  Plus,
  Users,
  Shield,
  Edit2,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Layers,
  X,
} from 'lucide-react';

export default function ClubsManagementPage() {
  const [clubs, setClubs] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Modal States
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Form States
  const [selectedClub, setSelectedClub] = useState(null);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'Technical',
    isActive: true,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const categories = ['Technical', 'Cultural', 'Sports', 'Academic', 'Social', 'Other'];

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [clubsRes, usersRes] = await Promise.all([getClubs(), adminGetUsers()]);
      setClubs(clubsRes.data?.clubs || []);
      setUsers(usersRes.data?.users || []);
    } catch (err) {
      setError(err.message || 'Failed to load clubs or users.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      const res = await adminCreateClub(formData);
      setClubs((prev) => [...prev, res.data.club]);
      setSuccessMsg(`Club "${res.data.club.name}" created successfully.`);
      setIsCreateModalOpen(false);
      setFormData({ name: '', description: '', category: 'Technical', isActive: true });
    } catch (err) {
      setError(err.message || 'Failed to create club.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!selectedClub) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const res = await adminUpdateClub(selectedClub._id, formData);
      setClubs((prev) => prev.map((c) => (c._id === selectedClub._id ? res.data.club : c)));
      setSuccessMsg(`Club "${res.data.club.name}" updated successfully.`);
      setIsEditModalOpen(false);
      setSelectedClub(null);
    } catch (err) {
      setError(err.message || 'Failed to update club.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAssignSubmit = async (e) => {
    e.preventDefault();
    if (!selectedClub || !selectedUserId) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const res = await adminAssignOrganizer(selectedClub._id, selectedUserId);
      setClubs((prev) => prev.map((c) => (c._id === selectedClub._id ? res.data.club : c)));
      setSuccessMsg('Organizer assigned successfully.');
      setIsAssignModalOpen(false);
      setSelectedUserId('');
      setSelectedClub(null);
      // Reload users in case role was elevated to organizer
      const usersRes = await adminGetUsers();
      setUsers(usersRes.data?.users || []);
    } catch (err) {
      setError(err.message || 'Failed to assign organizer.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveOrganizer = async (clubId, userId) => {
    if (!window.confirm('Remove this organizer from the club?')) return;
    setError(null);
    try {
      const res = await adminRemoveOrganizer(clubId, userId);
      setClubs((prev) => prev.map((c) => (c._id === clubId ? res.data.club : c)));
      setSuccessMsg('Organizer removed from club successfully.');
    } catch (err) {
      setError(err.message || 'Failed to remove organizer.');
    }
  };

  const openEditModal = (club) => {
    setSelectedClub(club);
    setFormData({
      name: club.name,
      description: club.description,
      category: club.category,
      isActive: club.isActive,
    });
    setIsEditModalOpen(true);
  };

  const openAssignModal = (club) => {
    setSelectedClub(club);
    setSelectedUserId('');
    setIsAssignModalOpen(true);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-4)' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <Layers size={28} color="var(--color-primary)" />
            <h1>Club Management</h1>
          </div>
          <p style={{ marginTop: 'var(--space-2)' }}>
            Create student clubs, edit profiles, and assign authorized club organizers.
          </p>
        </div>

        <button
          onClick={() => {
            setFormData({ name: '', description: '', category: 'Technical', isActive: true });
            setIsCreateModalOpen(true);
          }}
          className="btn btn-primary"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-2)' }}
        >
          <Plus size={18} />
          <span>Create New Club</span>
        </button>
      </div>

      {/* Notifications */}
      {successMsg && (
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
          <span>{successMsg}</span>
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

      {/* Clubs Grid */}
      {loading ? (
        <div className="card" style={{ textAlign: 'center', padding: 'var(--space-8)' }}>
          <p>Loading clubs...</p>
        </div>
      ) : clubs.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 'var(--space-8)' }}>
          <p>No clubs registered yet. Click &quot;Create New Club&quot; to add the first campus club.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 'var(--space-4)' }}>
          {clubs.map((club) => (
            <div key={club._id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 'var(--space-2)' }}>
                <div>
                  <span className="badge badge-info" style={{ marginBottom: 'var(--space-1)' }}>
                    {club.category}
                  </span>
                  <h2 style={{ fontSize: '18px', marginTop: '4px' }}>{club.name}</h2>
                </div>
                <span className={`badge ${club.isActive ? 'badge-success' : 'badge-error'}`}>
                  {club.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>

              <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', flex: 1 }}>
                {club.description}
              </p>

              {/* Assigned Organizers Section */}
              <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 'var(--space-3)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-2)' }}>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-navy)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Users size={15} />
                    <span>Assigned Organizers ({club.organizers?.length || 0})</span>
                  </span>

                  <button
                    onClick={() => openAssignModal(club)}
                    className="btn btn-secondary"
                    style={{ padding: '2px 8px', fontSize: '12px', minHeight: '28px' }}
                  >
                    + Assign
                  </button>
                </div>

                {club.organizers?.length > 0 ? (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-1)' }}>
                    {club.organizers.map((org) => (
                      <span
                        key={org._id}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          backgroundColor: '#F1F5F9',
                          padding: '4px 8px',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: '12px',
                        }}
                      >
                        <strong>{org.name}</strong>
                        <button
                          type="button"
                          onClick={() => handleRemoveOrganizer(club._id, org._id)}
                          title="Remove organizer"
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--color-error)',
                            cursor: 'pointer',
                            padding: '0',
                            display: 'flex',
                            alignItems: 'center',
                          }}
                        >
                          <X size={12} />
                        </button>
                      </span>
                    ))}
                  </div>
                ) : (
                  <p style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                    No organizers assigned yet.
                  </p>
                )}
              </div>

              {/* Card Actions */}
              <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 'var(--space-3)', display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)' }}>
                <button
                  onClick={() => openEditModal(club)}
                  className="btn btn-secondary"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '13px', minHeight: '32px' }}
                >
                  <Edit2 size={14} />
                  <span>Edit Club</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Club Modal */}
      {isCreateModalOpen && (
        <div style={modalOverlayStyle}>
          <div className="card" style={modalContentStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
              <h2>Create New Campus Club</h2>
              <button onClick={() => setIsCreateModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              <div>
                <label style={labelStyle}>Club Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Robotics & Automation Club"
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={labelStyle}>Category</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  style={inputStyle}
                >
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={labelStyle}>Description (min 10 characters)</label>
                <textarea
                  required
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe the club's focus, mission, and activities..."
                  style={{ ...inputStyle, resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)', marginTop: 'var(--space-2)' }}>
                <button type="button" onClick={() => setIsCreateModalOpen(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={isSubmitting} className="btn btn-primary">
                  {isSubmitting ? 'Creating...' : 'Create Club'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Club Modal */}
      {isEditModalOpen && (
        <div style={modalOverlayStyle}>
          <div className="card" style={modalContentStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
              <h2>Edit Club Details</h2>
              <button onClick={() => setIsEditModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              <div>
                <label style={labelStyle}>Club Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={labelStyle}>Category</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  style={inputStyle}
                >
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={labelStyle}>Description</label>
                <textarea
                  required
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  style={{ ...inputStyle, resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                />
                <label htmlFor="isActive" style={{ fontSize: '14px', fontWeight: 500 }}>
                  Active (visible for event creation and student discovery)
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)', marginTop: 'var(--space-2)' }}>
                <button type="button" onClick={() => setIsEditModalOpen(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={isSubmitting} className="btn btn-primary">
                  {isSubmitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Organizer Modal */}
      {isAssignModalOpen && (
        <div style={modalOverlayStyle}>
          <div className="card" style={modalContentStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
              <h2>Assign Organizer to {selectedClub?.name}</h2>
              <button onClick={() => setIsAssignModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAssignSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              <div>
                <label style={labelStyle}>Select Active User</label>
                <select
                  required
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  style={inputStyle}
                >
                  <option value="">-- Choose a campus user --</option>
                  {users
                    .filter((u) => u.isActive)
                    .map((u) => (
                      <option key={u._id} value={u._id}>
                        {u.name} ({u.email}) — Current Role: {u.role}
                      </option>
                    ))}
                </select>
                <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
                  Assigning a student automatically elevates their role to Organizer.
                </p>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)', marginTop: 'var(--space-2)' }}>
                <button type="button" onClick={() => setIsAssignModalOpen(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={isSubmitting || !selectedUserId} className="btn btn-primary">
                  {isSubmitting ? 'Assigning...' : 'Assign Organizer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const modalOverlayStyle = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(0, 0, 0, 0.5)',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  padding: '16px',
  zIndex: 1000,
};

const modalContentStyle = {
  maxWidth: '520px',
  width: '100%',
  backgroundColor: '#FFFFFF',
};

const labelStyle = {
  display: 'block',
  fontSize: '14px',
  fontWeight: 600,
  marginBottom: '4px',
};

const inputStyle = {
  width: '100%',
  padding: '8px 12px',
  borderRadius: 'var(--radius-sm)',
  border: '1px solid var(--color-border)',
  fontSize: '14px',
};
