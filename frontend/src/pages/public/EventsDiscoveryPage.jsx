import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { discoverEvents } from '../../services/eventService';
import { getClubs } from '../../services/clubService';
import EventCard from '../../components/events/EventCard';
import {
  Compass,
  Search,
  Filter,
  X,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Calendar,
} from 'lucide-react';

const CATEGORIES = ['All', 'Technical', 'Cultural', 'Sports', 'Academic', 'Social', 'Other'];

export default function EventsDiscoveryPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  // Filter states derived from or syncing with URL search params
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [category, setCategory] = useState(searchParams.get('category') || 'All');
  const [clubId, setClubId] = useState(searchParams.get('clubId') || 'All');
  const [dateFilter, setDateFilter] = useState(searchParams.get('dateFilter') || 'upcoming');
  const [page, setPage] = useState(parseInt(searchParams.get('page'), 10) || 1);

  // Data states
  const [events, setEvents] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [clubs, setClubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load active campus clubs for the club filter selector
  useEffect(() => {
    const fetchClubs = async () => {
      try {
        const res = await getClubs();
        setClubs(res.data?.clubs || []);
      } catch (err) {
        console.error('Failed to load clubs for filter:', err);
      }
    };
    fetchClubs();
  }, []);

  // Fetch discoverable events from backend with applied filters
  useEffect(() => {
    const fetchDiscoveryEvents = async () => {
      setLoading(true);
      setError(null);
      try {
        const query = {
          page,
          limit: 20,
          dateFilter,
        };
        if (search.trim()) query.search = search.trim();
        if (category && category !== 'All') query.category = category;
        if (clubId && clubId !== 'All') query.clubId = clubId;

        const res = await discoverEvents(query);
        setEvents(res.data?.events || []);
        setPagination(res.data?.pagination || { page: 1, limit: 20, total: 0, totalPages: 0 });
      } catch (err) {
        setError(err.message || 'Failed to load events. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchDiscoveryEvents();
  }, [search, category, clubId, dateFilter, page]);

  // Sync state to URL search parameters for shareable/bookmarkable URLs
  const updateFilterParam = (key, value) => {
    setPage(1); // Reset to page 1 on filter change
    const newParams = new URLSearchParams(searchParams);
    if (value && value !== 'All' && !(key === 'dateFilter' && value === 'upcoming')) {
      newParams.set(key, value);
    } else {
      newParams.delete(key);
    }
    newParams.delete('page');
    setSearchParams(newParams);
  };

  const handleClearFilters = () => {
    setSearch('');
    setCategory('All');
    setClubId('All');
    setDateFilter('upcoming');
    setPage(1);
    setSearchParams({});
  };

  const hasActiveFilters =
    search.trim() !== '' ||
    category !== 'All' ||
    clubId !== 'All' ||
    dateFilter !== 'upcoming';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      {/* Page Header */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <Compass size={28} color="var(--color-primary)" />
          <h1 style={{ fontSize: '28px', color: 'var(--color-navy)' }}>Discover Campus Events</h1>
        </div>
        <p style={{ marginTop: 'var(--space-2)', color: 'var(--color-text-secondary)', fontSize: '15px' }}>
          Explore workshops, hackathons, seminars, and cultural festivals happening across the university.
        </p>
      </div>

      {/* Error Alert */}
      {error && (
        <div
          role="alert"
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

      {/* Filter and Search Panel */}
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        {/* Search Bar + Clear Action */}
        <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
            <label htmlFor="event-search-input" className="sr-only" style={{ display: 'none' }}>
              Search events
            </label>
            <Search
              size={18}
              style={{
                position: 'absolute',
                left: '12px',
                top: '12px',
                color: 'var(--color-text-secondary)',
                pointerEvents: 'none',
              }}
            />
            <input
              id="event-search-input"
              type="text"
              placeholder="Search events by title or keywords..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                updateFilterParam('search', e.target.value);
              }}
              style={{
                width: '100%',
                padding: '10px 12px 10px 38px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--color-border)',
                fontSize: '14px',
                minHeight: '44px',
              }}
            />
          </div>

          {/* Club Dropdown Filter */}
          <div style={{ minWidth: '180px' }}>
            <label htmlFor="club-filter-select" className="sr-only" style={{ display: 'none' }}>
              Filter by Club
            </label>
            <select
              id="club-filter-select"
              value={clubId}
              onChange={(e) => {
                setClubId(e.target.value);
                updateFilterParam('clubId', e.target.value);
              }}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--color-border)',
                fontSize: '14px',
                minHeight: '44px',
                backgroundColor: '#FFFFFF',
                cursor: 'pointer',
              }}
            >
              <option value="All">All Campus Clubs</option>
              {clubs.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Date Range Dropdown Filter */}
          <div style={{ minWidth: '150px' }}>
            <label htmlFor="date-filter-select" className="sr-only" style={{ display: 'none' }}>
              Filter by Date
            </label>
            <select
              id="date-filter-select"
              value={dateFilter}
              onChange={(e) => {
                setDateFilter(e.target.value);
                updateFilterParam('dateFilter', e.target.value);
              }}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--color-border)',
                fontSize: '14px',
                minHeight: '44px',
                backgroundColor: '#FFFFFF',
                cursor: 'pointer',
              }}
            >
              <option value="upcoming">Upcoming Events</option>
              <option value="today">Today (IST)</option>
              <option value="all">All Dates</option>
            </select>
          </div>

          {/* Clear Filters Button */}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleClearFilters}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '10px 16px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--color-border)',
                backgroundColor: '#F8FAFC',
                color: 'var(--color-error)',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: 600,
                minHeight: '44px',
              }}
            >
              <X size={15} />
              <span>Clear Filters</span>
            </button>
          )}
        </div>

        {/* Category Pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-secondary)', marginRight: '4px' }}>
            Category:
          </span>
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => {
                setCategory(cat);
                updateFilterParam('category', cat);
              }}
              style={{
                padding: '6px 14px',
                borderRadius: 'var(--radius-full)',
                border: '1px solid var(--color-border)',
                backgroundColor: category === cat ? 'var(--color-primary)' : '#FFFFFF',
                color: category === cat ? '#FFFFFF' : 'var(--color-text-secondary)',
                fontSize: '13px',
                cursor: 'pointer',
                fontWeight: 500,
                minHeight: '36px',
                transition: 'all 0.15s ease',
              }}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Discovery Results Overview */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '14px', color: 'var(--color-text-secondary)' }}>
        <span>
          Showing {events.length} of {pagination.total} published event{pagination.total === 1 ? '' : 's'}
        </span>
        {pagination.totalPages > 1 && (
          <span>
            Page {pagination.page} of {pagination.totalPages}
          </span>
        )}
      </div>

      {/* Events Grid */}
      {loading ? (
        <div className="card" style={{ textAlign: 'center', padding: 'var(--space-8)' }}>
          <p style={{ color: 'var(--color-text-secondary)' }}>Loading campus events...</p>
        </div>
      ) : events.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 'var(--space-8)' }}>
          <Calendar size={40} color="var(--color-text-muted)" style={{ margin: '0 auto var(--space-3)' }} />
          <h2 style={{ fontSize: '18px', color: 'var(--color-navy)', marginBottom: 'var(--space-2)' }}>
            No Events Found
          </h2>
          <p style={{ color: 'var(--color-text-secondary)', maxWidth: '420px', margin: '0 auto var(--space-4)' }}>
            {hasActiveFilters
              ? 'No published events match your active search and filter criteria. Try clearing or relaxing some filters.'
              : 'There are currently no upcoming published events scheduled on campus. Please check back soon!'}
          </p>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleClearFilters}
              className="btn btn-secondary"
              style={{ margin: '0 auto', display: 'inline-flex', minHeight: '40px' }}
            >
              Clear All Filters
            </button>
          )}
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: 'var(--space-4)',
          }}
        >
          {events.map((event) => (
            <EventCard key={event._id} event={event} />
          ))}
        </div>
      )}

      {/* Pagination Controls */}
      {pagination.totalPages > 1 && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: 'var(--space-3)',
            marginTop: 'var(--space-4)',
          }}
        >
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => {
              const newP = Math.max(1, page - 1);
              setPage(newP);
              const p = new URLSearchParams(searchParams);
              p.set('page', newP);
              setSearchParams(p);
            }}
            className="btn btn-secondary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', minHeight: '40px' }}
            aria-label="Previous Page"
          >
            <ChevronLeft size={16} />
            <span>Previous</span>
          </button>

          <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-navy)' }}>
            {pagination.page} / {pagination.totalPages}
          </span>

          <button
            type="button"
            disabled={page >= pagination.totalPages}
            onClick={() => {
              const newP = Math.min(pagination.totalPages, page + 1);
              setPage(newP);
              const p = new URLSearchParams(searchParams);
              p.set('page', newP);
              setSearchParams(p);
            }}
            className="btn btn-secondary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', minHeight: '40px' }}
            aria-label="Next Page"
          >
            <span>Next</span>
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
