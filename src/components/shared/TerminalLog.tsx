import { useEffect, useRef } from 'react';
import type { LogMessage } from '../../types';

interface Props {
  messages: LogMessage[];
}

const TYPE_COLORS: Record<LogMessage['type'], string> = {
  info: 'var(--text-secondary)',
  success: 'var(--accent-green)',
  warning: 'var(--accent-amber)',
  error: 'var(--accent-red)',
};

export function TerminalLog({ messages }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div
      aria-live="polite"
      aria-label="Scan log"
      style={{
        background: 'var(--bg-base)',
        border: '1px solid var(--border)',
        borderRadius: '8px',
        padding: '20px',
        height: '400px',
        overflowY: 'auto',
        fontFamily: 'IBM Plex Mono, monospace',
        fontSize: '13px',
        lineHeight: '1.7',
      }}
    >
      {messages.length === 0 && (
        <span style={{ color: 'var(--text-muted)' }}>Waiting to start...</span>
      )}
      {messages.map((msg, i) => (
        <div
          key={i}
          className="log-message"
          style={{ color: TYPE_COLORS[msg.type] }}
        >
          {msg.text}
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
