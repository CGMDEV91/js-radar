import { useEffect } from 'react';
import { AlertTriangle, ArrowLeft } from 'lucide-react';

interface Props {
  onBack: () => void;
}

export function DisclaimerView({ onBack }: Props) {
  useEffect(() => { window.scrollTo(0, 0); }, []);
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-base)', overflowX: 'hidden' }}>

      {/* Nav */}
      <div style={{ height: '56px', flexShrink: 0 }} />
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        background: 'rgba(10,10,15,0.85)', backdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--border)', padding: '0 24px',
      }}>
        <div style={{
          maxWidth: '1100px', margin: '0 auto', height: '56px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <button
            onClick={onBack}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--text-secondary)', display: 'flex', alignItems: 'center',
              gap: '8px', fontSize: '13px', padding: '0',
            }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-primary)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-secondary)')}
          >
            <ArrowLeft size={15} />
            Back to JSRadar
          </button>
          <span style={{
            fontSize: '12px', color: 'var(--accent-amber)', fontWeight: 600,
            textTransform: 'uppercase', letterSpacing: '1px',
          }}>
            Legal
          </span>
        </div>
      </nav>

      {/* Content */}
      <div style={{ maxWidth: '720px', margin: '0 auto', padding: '48px 24px 80px' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '36px' }}>
          <div style={{
            width: '48px', height: '48px', borderRadius: '12px',
            background: 'rgba(251,191,36,0.10)', border: '1px solid rgba(251,191,36,0.28)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <AlertTriangle size={22} color="#fbbf24" />
          </div>
          <div>
            <h1 style={{
              fontSize: 'clamp(22px, 3vw, 30px)', fontWeight: 700,
              color: 'var(--text-primary)', margin: '0 0 4px', letterSpacing: '-0.5px',
            }}>
              Terms of use
            </h1>
            <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-secondary)' }}>
              Please read before scanning any repository or website.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

          <div style={{
            background: 'var(--bg-surface)', border: '1px solid var(--border)',
            borderRadius: '12px', padding: '24px 28px',
          }}>
            <h2 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 12px', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
              Informational use only
            </h2>
            <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.75 }}>
              JSRadar is a free, browser-based tool that scans JavaScript files for known
              vulnerabilities. Results are provided for informational purposes only and are
              not legally binding. They do not constitute a professional security audit,
              penetration test, or legal compliance certification of any kind.
            </p>
          </div>

          <div style={{
            background: 'var(--bg-surface)', border: '1px solid var(--border)',
            borderRadius: '12px', padding: '24px 28px',
          }}>
            <h2 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 16px', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
              No liability
            </h2>
            <ul style={{ margin: 0, padding: '0 0 0 18px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {[
                'The author(s) of JSRadar are not liable for any direct, indirect, incidental, or consequential damages arising from the use of this tool or reliance on its results.',
                'Results may contain false positives (findings that are not real vulnerabilities) or false negatives (real vulnerabilities that the tool did not detect).',
                'Library version detection and CVE matching are based on pattern matching against third-party databases. Detection accuracy is not guaranteed.',
                'Third-party data sources (retire.js, OSV.dev, NVD) may be incomplete, outdated, or unavailable. JSRadar has no control over their content.',
              ].map((item, i) => (
                <li key={i} style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.75 }}>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div style={{
            background: 'rgba(248,113,113,0.04)', border: '1px solid rgba(248,113,113,0.18)',
            borderRadius: '12px', padding: '24px 28px',
          }}>
            <h2 style={{ fontSize: '13px', fontWeight: 700, color: '#f87171', margin: '0 0 16px', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
              Authorised use only
            </h2>
            <ul style={{ margin: 0, padding: '0 0 0 18px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {[
                'You must have explicit permission to scan any repository or website you do not own. Scanning third-party assets without authorisation may violate applicable law.',
                'Relevant legislation includes but is not limited to: the Computer Fraud and Abuse Act (CFAA, United States), the Computer Misuse Act (CMA, United Kingdom), and equivalent laws in other jurisdictions.',
                'JSRadar is intended for defensive security research, auditing your own projects, and properly authorised security engagements only.',
              ].map((item, i) => (
                <li key={i} style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.75 }}>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div style={{
            background: 'var(--bg-surface)', border: '1px solid var(--border)',
            borderRadius: '12px', padding: '24px 28px',
          }}>
            <h2 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 12px', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
              Your responsibility
            </h2>
            <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.75 }}>
              By using JSRadar you confirm that you are acting within the boundaries of
              applicable law and that you accept full and sole responsibility for any scan
              you initiate and any action you take based on the results. The author(s) of
              JSRadar bear no responsibility whatsoever for how this tool is used.
            </p>
          </div>

        </div>

        <div style={{ marginTop: '32px', textAlign: 'center' }}>
          <button
            type="button"
            onClick={onBack}
            style={{
              background: 'none', border: '1px solid var(--border)', borderRadius: '8px',
              color: 'var(--text-secondary)', fontSize: '14px', padding: '12px 32px',
              cursor: 'pointer',
            }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--text-secondary)')}
            onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
          >
            Back to home
          </button>
        </div>

      </div>
    </div>
  );
}
