import React from 'react';
import { Link } from 'react-router-dom';
import { formatToIST, getPhaseBadgeConfig } from '../../utils/dateUtils';
import { Calendar, MapPin, Users, Layers, ArrowRight } from 'lucide-react';

export default function EventCard({ event }) {
  if (!event) return null;

  const badge = getPhaseBadgeConfig(event.phase || event.status);

  return (
    <div
      className="card"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-3)',
        transition: 'transform 0.15s ease, box-shadow 0.15s ease',
        height: '100%',
      }}
    >
      {/* Banner if available */}
      {event.bannerUrl && (
        <div
          style={{
            width: '100%',
            height: '140px',
            overflow: 'hidden',
            borderRadius: 'var(--radius-sm)',
            backgroundColor: '#F1F5F9',
          }}
        >
          <img
            src={event.bannerUrl}
            alt={event.title}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            loading="lazy"
          />
        </div>
      )}

      {/* Category & Lifecycle Badge */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 'var(--space-2)' }}>
        <span className="badge badge-info">{event.category}</span>
        <span
          className={`badge ${badge.className}`}
          style={badge.bg ? { backgroundColor: badge.bg, color: badge.color } : {}}
        >
          {badge.label}
        </span>
      </div>

      {/* Title & Club */}
      <div>
        <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--color-navy)', lineHeight: 1.3 }}>
          {event.title}
        </h3>
        {event.club && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '13px',
              color: 'var(--color-primary)',
              marginTop: '4px',
              fontWeight: 500,
            }}
          >
            <Layers size={14} />
            <span>{event.club.name}</span>
          </div>
        )}
      </div>

      {/* Description Snippet */}
      <p
        style={{
          fontSize: '14px',
          color: 'var(--color-text-secondary)',
          lineHeight: 1.5,
          flex: 1,
          display: '-webkit-box',
          WebkitLineClamp: 3,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}
      >
        {event.description}
      </p>

      {/* Event Details: Date, Venue, Capacity */}
      <div
        style={{
          borderTop: '1px solid var(--color-border)',
          paddingTop: 'var(--space-3)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-2)',
          fontSize: '13px',
          color: 'var(--color-text-secondary)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Calendar size={15} color="var(--color-primary)" />
          <span style={{ fontWeight: 500, color: 'var(--color-text-primary)' }}>
            {formatToIST(event.startDateTime)}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <MapPin size={15} color="var(--color-qr)" />
          <span>{event.venue}</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Users size={15} color="var(--color-navy)" />
            <span>
              {event.capacityStatus === 'FULL'
                ? 'Full (0 seats left)'
                : `${event.availableSeats ?? (event.capacity - (event.registeredCount || 0))} seats left / ${event.capacity}`}
            </span>
          </div>

          {event.capacityStatus === 'ALMOST_FULL' && (
            <span
              className="badge"
              style={{ backgroundColor: '#FEF3C7', color: '#92400E', fontSize: '11px', fontWeight: 600 }}
            >
              Almost Full
            </span>
          )}
          {event.capacityStatus === 'FULL' && (
            <span
              className="badge"
              style={{ backgroundColor: '#FEE2E2', color: '#991B1B', fontSize: '11px', fontWeight: 600 }}
            >
              Full
            </span>
          )}
        </div>
      </div>

      {/* View Details Link */}
      <div style={{ marginTop: 'var(--space-2)' }}>
        <Link
          to={`/events/${event._id}`}
          className="btn btn-secondary"
          style={{
            width: '100%',
            justifyContent: 'center',
            fontSize: '13px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            minHeight: '44px',
          }}
        >
          <span>View Event Details</span>
          <ArrowRight size={14} />
        </Link>
      </div>
    </div>
  );
}
