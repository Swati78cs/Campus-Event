import React, { useEffect, useState } from 'react';
import { getClubs } from '../../services/clubService';
import { Layers, Search, AlertCircle, Users } from 'lucide-react';

export default function ClubsPage() {
  const [clubs, setClubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  const categories = ['All', 'Technical', 'Cultural', 'Sports', 'Academic', 'Social', 'Other'];

  useEffect(() => {
    const fetchClubs = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await getClubs();
        setClubs(res.data?.clubs || []);
      } catch (err) {
        setError(err.message || 'Failed to load clubs.');
      } finally {
        setLoading(false);
      }
    };
    fetchClubs();
  }, []);

  const filteredClubs = clubs.filter((club) => {
    const matchesCategory = selectedCategory === 'All' || club.category === selectedCategory;
    const matchesSearch =
      club.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      club.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <Layers size={28} color="var(--color-primary)" />
          <h1>Campus Clubs &amp; Societies</h1>
        </div>
        <p style={{ marginTop: 'var(--space-2)' }}>
          Discover student organizations, technical teams, and cultural clubs across the university.
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

      {/* Filters & Search Bar */}
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
        <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
            <Search size={18} style={{ position: 'absolute', left: '12px', top: '10px', color: 'var(--color-text-secondary)' }} />
            <input
              type="text"
              placeholder="Search clubs by name or keywords..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px 8px 38px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--color-border)',
                fontSize: '14px',
              }}
            />
          </div>
        </div>

        {/* Category Pills */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              style={{
                padding: '4px 12px',
                borderRadius: 'var(--radius-full)',
                border: '1px solid var(--color-border)',
                backgroundColor: selectedCategory === cat ? 'var(--color-primary)' : '#FFFFFF',
                color: selectedCategory === cat ? '#FFFFFF' : 'var(--color-text-secondary)',
                fontSize: '13px',
                cursor: 'pointer',
                fontWeight: 500,
                minHeight: '32px',
              }}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Clubs Grid */}
      {loading ? (
        <div className="card" style={{ textAlign: 'center', padding: 'var(--space-8)' }}>
          <p>Loading campus clubs...</p>
        </div>
      ) : filteredClubs.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 'var(--space-8)' }}>
          <p>No clubs matched your search criteria.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 'var(--space-4)' }}>
          {filteredClubs.map((club) => (
            <div key={club._id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              <div>
                <span className="badge badge-info">{club.category}</span>
                <h2 style={{ fontSize: '20px', marginTop: 'var(--space-1)' }}>{club.name}</h2>
              </div>

              <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', flex: 1 }}>
                {club.description}
              </p>

              <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 'var(--space-2)', display: 'flex', alignItems: 'center', gap: 'var(--space-1)', fontSize: '13px', color: 'var(--color-text-secondary)' }}>
                <Users size={16} color="var(--color-navy)" />
                <span>Organizers: {club.organizers?.length || 0}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
