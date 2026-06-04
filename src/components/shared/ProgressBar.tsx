interface Props {
  pct: number;
  phase: string;
}

export function ProgressBar({ pct, phase }: Props) {
  const clamped = Math.min(100, Math.max(0, pct));
  const isComplete = clamped >= 100;

  return (
    <div style={{ width: '100%' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '6px',
        }}
      >
        <span
          style={{
            fontSize: '12px',
            color: 'var(--text-secondary)',
            fontFamily: 'IBM Plex Mono, monospace',
          }}
        >
          {phase}
        </span>
        <span
          style={{
            fontSize: '12px',
            color: isComplete ? 'var(--accent-green)' : 'var(--text-secondary)',
            fontFamily: 'IBM Plex Mono, monospace',
            fontWeight: 600,
          }}
        >
          {clamped}%
        </span>
      </div>

      <div
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Scan progress"
        style={{
          width: '100%',
          height: '8px',
          background: 'var(--border)',
          borderRadius: '4px',
          overflow: 'hidden',
        }}
      >
        <div
          className={!isComplete ? 'progress-active' : ''}
          style={{
            height: '100%',
            width: `${clamped}%`,
            background: isComplete
              ? 'var(--accent-green)'
              : 'linear-gradient(90deg, var(--accent-green) 0%, #34d399 100%)',
            borderRadius: '4px',
            transition: 'width 400ms ease',
          }}
        />
      </div>
    </div>
  );
}
