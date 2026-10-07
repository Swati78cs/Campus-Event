import React from 'react';

export default function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  color = 'var(--color-primary)',
  bgColor = '#EFF6FF',
  badge,
}) {
  return (
    <div
      className="card"
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: 'var(--space-4)',
        gap: 'var(--space-2)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>
          {title}
        </span>
        {Icon && (
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              backgroundColor: bgColor,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon size={18} color={color} />
          </div>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
        <span style={{ fontSize: '26px', fontWeight: 700, color: 'var(--color-navy)' }}>
          {value}
        </span>
        {badge && (
          <span
            className="badge"
            style={{ fontSize: '11px', fontWeight: 600, backgroundColor: bgColor, color }}
          >
            {badge}
          </span>
        )}
      </div>

      {subtitle && (
        <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
          {subtitle}
        </span>
      )}
    </div>
  );
}
