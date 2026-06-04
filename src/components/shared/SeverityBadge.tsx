import type { Severity } from '../../types';

interface Props {
  severity: Severity;
  size?: 'sm' | 'md';
}

const CONFIG: Record<Severity, { color: string; bg: string; icon: string; label: string }> = {
  critical: { color: '#f87171', bg: 'rgba(248,113,113,0.12)', icon: '✗', label: 'Critical' },
  high:     { color: '#f87171', bg: 'rgba(248,113,113,0.08)', icon: '↑', label: 'High' },
  medium:   { color: '#fbbf24', bg: 'rgba(251,191,36,0.10)', icon: '⚠', label: 'Medium' },
  low:      { color: '#60a5fa', bg: 'rgba(96,165,250,0.10)', icon: '↓', label: 'Low' },
  info:     { color: '#a78bfa', bg: 'rgba(167,139,250,0.10)', icon: 'ℹ', label: 'Info' },
};

export function SeverityBadge({ severity, size = 'md' }: Props) {
  const { color, bg, icon, label } = CONFIG[severity];
  const pad = size === 'sm' ? '2px 8px' : '4px 10px';
  const fontSize = size === 'sm' ? '11px' : '12px';

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        background: bg,
        color,
        border: `1px solid ${color}33`,
        borderRadius: '6px',
        padding: pad,
        fontSize,
        fontWeight: 600,
        fontFamily: 'Inter, sans-serif',
        whiteSpace: 'nowrap',
      }}
      aria-label={`Severity: ${label}`}
    >
      <span aria-hidden="true">{icon}</span>
      {label}
    </span>
  );
}
