import React, { useEffect, useState } from 'react';
import { getMyClubs } from '../../services/clubService';
import { Briefcase, Users, Layers, AlertCircle } from 'lucide-react';

export default function OrganizerClubPage() {
  const [clubs, setClubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchClubs = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await getMyClubs();
        setClubs(res.data?.clubs || []);
      } catch (err) {
        setError(err.message || 'Failed to load assigned clubs.');
      } finally {
        setLoading(false);
      }
    };
    fetchClubs();
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <Briefcase size={28} color="var(--color-primary)" />
          <h1>My Assigned Clubs</h1>
        </div>
        <p style={{ marginTop: 'var(--space-2)' }}>
          You are authorized to manage events and oversee registrations for the following clubs.
        </p>
      </div>

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

      {loading ? (
        <div className="card" style={{ textAlign: 'center', padding: 'var(--space-8)' }}>
          <p>Loading your clubs...</p>
        </div>
      ) : clubs.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 'var(--space-8)' }}>
          <Layers size={36} color="var(--color-text-secondary)" style={{ margin: '0 auto var(--space-2)' }} />
          <h2>No Clubs Assigned Yet</h2>
          <p style={{ marginTop: 'var(--space-2)', maxWidth: '440px', margin: 'var(--space-2) auto 0' }}>
            You have the Organizer role, but have not yet been assigned to a campus club. Please contact a Campus Administrator to assign you to your club.
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 'var(--space-4)' }}>
          {clubs.map((club) => (
            <div key={club._id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              <div>
                <span className="badge badge-info">{club.category}</span>
                <h2 style={{ fontSize: '20px', marginTop: 'var(--space-1)' }}>{club.name}</h2>
              </div>

              <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', flex: 1 }}>
                {club.description}
              </p>

              <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 'var(--space-3)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)', marginBottom: 'var(--space-2)' }}>
                  <Users size={16} color="var(--color-navy)" />
                  <strong style={{ fontSize: '13px' }}>Club Organizers ({club.organizers?.length || 0}):</strong>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {club.organizers?.map((org) => (
                    <span
                      key={org._id}
                      style={{
                        backgroundColor: '#F1F5F9',
                        padding: '3px 8px',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '12px',
                      }}
                    >
                      {org.name} ({org.email})
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
