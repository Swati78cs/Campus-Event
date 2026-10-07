import React, { useState } from 'react';
import { Calendar, TrendingUp } from 'lucide-react';

export default function RegistrationTrendChart({ data = [] }) {
  const [hoveredIndex, setHoveredIndex] = useState(null);

  if (!data || data.length === 0) {
    return (
      <div
        style={{
          padding: 'var(--space-8)',
          textAlign: 'center',
          backgroundColor: '#F8FAFC',
          borderRadius: 'var(--radius-sm)',
          border: '1px dashed var(--color-border)',
        }}
      >
        <Calendar size={28} color="var(--color-text-secondary)" style={{ margin: '0 auto var(--space-2)' }} />
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '14px', margin: 0 }}>
          No registration trend data available yet.
        </p>
      </div>
    );
  }

  // Dimensions
  const height = 180;
  const paddingLeft = 35;
  const paddingRight = 20;
  const paddingTop = 20;
  const paddingBottom = 30;
  const chartHeight = height - paddingTop - paddingBottom;

  // Max value calculation
  const maxCount = Math.max(...data.map((d) => d.count), 1);
  const yTicks = [0, Math.ceil(maxCount / 2), maxCount];

  // Width is relative via SVG viewBox
  const viewBoxWidth = 500;
  const chartWidth = viewBoxWidth - paddingLeft - paddingRight;
  const stepX = data.length > 1 ? chartWidth / (data.length - 1) : chartWidth / 2;

  // Compute points for polyline and area
  const points = data.map((d, index) => {
    const x = data.length === 1 ? viewBoxWidth / 2 : paddingLeft + index * stepX;
    const y = paddingTop + chartHeight - (d.count / maxCount) * chartHeight;
    return { x, y, ...d };
  });

  const polylinePoints = points.map((p) => `${p.x},${p.y}`).join(' ');
  const areaPoints = `${points[0].x},${paddingTop + chartHeight} ${polylinePoints} ${points[points.length - 1].x},${paddingTop + chartHeight}`;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-navy)', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <TrendingUp size={16} color="var(--color-primary)" />
          Sign-ups Over Time
        </span>
        {hoveredIndex !== null && points[hoveredIndex] && (
          <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-primary)' }}>
            {points[hoveredIndex].date}: {points[hoveredIndex].count} registration{points[hoveredIndex].count === 1 ? '' : 's'}
          </span>
        )}
      </div>

      <div style={{ width: '100%', overflowX: 'auto' }}>
        <svg
          viewBox={`0 0 ${viewBoxWidth} ${height}`}
          style={{ width: '100%', height: 'auto', maxHeight: '200px', display: 'block' }}
        >
          {/* Grid lines and Y axis ticks */}
          {yTicks.map((tick, i) => {
            const y = paddingTop + chartHeight - (tick / maxCount) * chartHeight;
            return (
              <g key={i}>
                <line
                  x1={paddingLeft}
                  y1={y}
                  x2={viewBoxWidth - paddingRight}
                  y2={y}
                  stroke="#E2E8F0"
                  strokeDasharray="3 3"
                />
                <text
                  x={paddingLeft - 8}
                  y={y + 4}
                  textAnchor="end"
                  fontSize="10"
                  fill="#94A3B8"
                >
                  {tick}
                </text>
              </g>
            );
          })}

          {/* Shaded Area */}
          <polygon
            points={areaPoints}
            fill="var(--color-primary)"
            fillOpacity="0.1"
          />

          {/* Polyline */}
          <polyline
            points={polylinePoints}
            fill="none"
            stroke="var(--color-primary)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Interactive Data points */}
          {points.map((p, idx) => (
            <g
              key={idx}
              onMouseEnter={() => setHoveredIndex(idx)}
              onMouseLeave={() => setHoveredIndex(null)}
              style={{ cursor: 'pointer' }}
            >
              <circle
                cx={p.x}
                cy={p.y}
                r={hoveredIndex === idx ? 6 : 4}
                fill={hoveredIndex === idx ? 'var(--color-primary)' : '#ffffff'}
                stroke="var(--color-primary)"
                strokeWidth="2"
              />
              {/* X Axis Labels */}
              {(data.length <= 7 || idx === 0 || idx === data.length - 1 || idx % 2 === 0) && (
                <text
                  x={p.x}
                  y={height - 10}
                  textAnchor="middle"
                  fontSize="9"
                  fill="#64748B"
                >
                  {p.date ? p.date.slice(5) : ''}
                </text>
              )}
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
}
