import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';

const STORAGE_KEY = 'jsradar_disclaimer_accepted_v1';

export function useDisclaimer() {
  const [accepted, setAccepted] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  });

  function accept() {
    try {
      localStorage.setItem(STORAGE_KEY, 'true');
    } catch { /* ignore */ }
    setAccepted(true);
  }

  return { accepted, accept };
}

interface Props {
  onAccept: () => void;
}

export function DisclaimerModal({ onAccept }: Props) {
  const [checked, setChecked] = useState(false);

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 9999,
      background: 'rgba(0,0,0,0.85)',
      backdropFilter: 'blur(6px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px',
    }}>
      <div style={{
        background: 'var(--bg-surface)',
        border: '1px solid rgba(251,191,36,0.35)',
        borderRadius: '16px',
        padding: 'clamp(24px, 5vw, 40px)',
        maxWidth: '560px',
        width: '100%',
        maxHeight: '90vh',
        overflowY: 'auto',
        boxShadow: '0 0 60px rgba(251,191,36,0.10)',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            background: 'rgba(251,191,36,0.12)',
            border: '1px solid rgba(251,191,36,0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}>
            <AlertTriangle size={20} color="#fbbf24" />
          </div>
          <div>
            <p style={{ fontSize: '11px', color: '#fbbf24', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1.2px', margin: '0 0 2px' }}>
              Legal disclaimer
            </p>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.3px' }}>
              Terms of use — read before scanning
            </h2>
          </div>
        </div>

        {/* Body */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.75, marginBottom: '24px' }}>

          <p style={{ margin: 0 }}>
            <strong style={{ color: 'var(--text-primary)' }}>JSRadar is an informational tool only.</strong>{' '}
            Scan results are provided "as-is" and are not legally binding. They do not constitute
            a professional security audit, penetration test, or legal compliance certification.
          </p>

          <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '8px', padding: '14px 16px' }}>
            <p style={{ margin: '0 0 10px', fontWeight: 600, color: 'var(--text-primary)', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
              No liability
            </p>
            <ul style={{ margin: 0, padding: '0 0 0 16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <li>The author(s) of JSRadar are <strong>not liable</strong> for any direct, indirect, incidental, or consequential damages arising from the use of this tool or reliance on its results.</li>
              <li>Results may contain <strong>false positives</strong> (findings that are not real vulnerabilities) or <strong>false negatives</strong> (real vulnerabilities that are not detected).</li>
              <li>Detected library versions and CVE matches are based on pattern matching against third-party databases. Version detection is <strong>not guaranteed to be accurate</strong>.</li>
            </ul>
          </div>

          <div style={{ background: 'rgba(248,113,113,0.06)', border: '1px solid rgba(248,113,113,0.2)', borderRadius: '8px', padding: '14px 16px' }}>
            <p style={{ margin: '0 0 10px', fontWeight: 600, color: '#f87171', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
              Authorised use only
            </p>
            <ul style={{ margin: 0, padding: '0 0 0 16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <li>You must have <strong>explicit permission</strong> to scan any repository or website that you do not own.</li>
              <li>Scanning third-party assets without authorisation may violate applicable law, including the Computer Fraud and Abuse Act (CFAA), the Computer Misuse Act (CMA), and similar legislation in your jurisdiction.</li>
              <li>JSRadar is intended for <strong>defensive security research, auditing your own projects, and authorised engagements</strong> only.</li>
            </ul>
          </div>

          <p style={{ margin: 0 }}>
            By using JSRadar you confirm that you are acting within the boundaries of applicable
            law and that you accept full responsibility for the outcome of any scan you initiate.
          </p>
        </div>

        {/* Checkbox */}
        <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer', marginBottom: '20px' }}>
          <input
            type="checkbox"
            checked={checked}
            onChange={e => setChecked(e.target.checked)}
            style={{ marginTop: '3px', accentColor: '#fbbf24', flexShrink: 0, width: '15px', height: '15px' }}
          />
          <span style={{ fontSize: '13px', color: 'var(--text-primary)', lineHeight: 1.6 }}>
            I have read and understood the above disclaimer. I accept full responsibility for
            my use of JSRadar and confirm I have authorisation to scan the target(s).
          </span>
        </label>

        {/* Button */}
        <button
          type="button"
          disabled={!checked}
          onClick={onAccept}
          style={{
            width: '100%',
            padding: '13px',
            borderRadius: '8px',
            border: 'none',
            background: checked ? '#fbbf24' : 'var(--bg-elevated)',
            color: checked ? '#0a0a0f' : 'var(--text-muted)',
            fontSize: '14px',
            fontWeight: 700,
            cursor: checked ? 'pointer' : 'not-allowed',
            transition: 'background 200ms, color 200ms',
            letterSpacing: '0.2px',
          }}
        >
          I accept — continue to JSRadar
        </button>
      </div>
    </div>
  );
}
