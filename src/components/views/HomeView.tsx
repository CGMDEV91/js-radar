import React, { useState, useRef, useEffect } from 'react';
import type { Provider, ProviderConfig } from '../../types';
import { ProviderSelector } from '../shared/ProviderSelector';
import {
  Eye, EyeOff, Shield, Bug, Globe, Lock, Key,
  ChevronRight, ArrowRight
} from 'lucide-react';
import { saveToken, getTokens, deleteToken } from '../../utils/tokenStorage';

function JSRadarLogo({ height = 40 }: { height?: number }) {
  const width = Math.round(height * (320 / 80));
  return (
    <svg width={width} height={height} viewBox="0 0 320 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="vsgrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#22FFA2"/>
          <stop offset="100%" stopColor="#3B82F6"/>
        </linearGradient>
      </defs>
      <circle cx="40" cy="40" r="22" stroke="url(#vsgrad)" strokeWidth="2" fill="none"/>
      <path d="M40 40 L62 40 A22 22 0 0 0 40 18 Z" fill="url(#vsgrad)" opacity="0.2"/>
      <circle cx="40" cy="40" r="3" fill="#22FFA2"/>
      <circle cx="40" cy="40" r="12" stroke="#22FFA2" strokeWidth="1" opacity="0.4"/>
      <circle cx="40" cy="40" r="18" stroke="#22FFA2" strokeWidth="1" opacity="0.2"/>
      <text x="80" y="54" fontFamily="Arial, Helvetica, sans-serif" fontSize="42" fontWeight="300" fill="white">
        JS<tspan fill="url(#vsgrad)">Radar</tspan>
      </text>
    </svg>
  );
}

interface Props {
  onStartScan: (config: ProviderConfig) => void;
}

const PLACEHOLDERS: Record<Provider, string> = {
  github: 'https://github.com/org/repo',
  gitlab: 'https://gitlab.com/org/repo',
  bitbucket: 'https://bitbucket.org/org/repo',
  publicUrl: 'https://example.com',
};

const TOKEN_HELP: Record<Provider, string> = {
  github: 'github.com → Settings → Developer settings → Personal access tokens → Tokens (classic) → repo (read)',
  gitlab: 'gitlab.com → User settings → Access tokens → read_repository',
  bitbucket: 'bitbucket.org → Personal settings → App passwords → Repositories: Read',
  publicUrl: '',
};

const SCANNERS = [
  {
    icon: <Shield size={20} />,
    color: '#6ee7b7',
    bg: 'rgba(110,231,183,0.10)',
    name: 'retire.js',
    desc: 'Known CVEs in jQuery, Bootstrap, Angular, Lodash and 500+ more libraries',
  },
  {
    icon: <Bug size={20} />,
    color: '#f87171',
    bg: 'rgba(248,113,113,0.10)',
    name: 'GSAP CVE-2020-28478',
    desc: 'Prototype pollution in GSAP < 3.6.0, port of the original bash scanner',
  },
  {
    icon: <Globe size={20} />,
    color: '#60a5fa',
    bg: 'rgba(96,165,250,0.10)',
    name: 'OSV.dev',
    desc: 'Queries the Open Source Vulnerabilities database for additional CVEs per package',
  },
  {
    icon: <Lock size={20} />,
    color: '#fbbf24',
    bg: 'rgba(251,191,36,0.10)',
    name: 'SRI checker',
    desc: 'External scripts without Subresource Integrity. Flags polyfill.io and similar risks',
  },
  {
    icon: <Key size={20} />,
    color: '#a78bfa',
    bg: 'rgba(167,139,250,0.10)',
    name: 'Secrets scanner',
    desc: 'Hardcoded Google API keys, AWS credentials, Stripe secrets, bearer tokens',
  },
];

const SCANNER_DETAILS = [
  {
    icon: <Shield size={24} />,
    color: '#6ee7b7',
    bg: 'rgba(110,231,183,0.08)',
    border: 'rgba(110,231,183,0.18)',
    name: 'retire.js',
    tagline: 'CVE database fingerprinting',
    source: 'github.com/RetireJS/retire.js',
    sourceLabel: 'Live JSON database',
    coverage: '500+ libraries',
    what: [
      'Known CVEs in jQuery, Bootstrap, Angular, Lodash, Moment.js, Handlebars, Underscore, Vue, and 500+ additional front-end libraries',
      'Vulnerability classes covered: prototype pollution, cross-site scripting (XSS), command injection, path traversal, and remote code execution in specific version ranges',
      'Libraries are fingerprinted from filename patterns, inline version comments, and version strings embedded in minified files',
    ],
    how: 'At scan time the engine fetches the retire.js vulnerability database — a live-maintained JSON file from GitHub — and runs each JS file against a set of fingerprint rules. A library is flagged when its detected version falls within a known vulnerable range (defined by "atOrAbove" and "below" fields in the database). Every finding is mapped to one or more CVE identifiers with severity levels sourced from the National Vulnerability Database (NVD).',
    examples: [
      { cve: 'CVE-2019-11358', detail: 'jQuery < 3.4.0 · Prototype pollution via $.extend' },
      { cve: 'CVE-2019-8331', detail: 'Bootstrap < 4.3.1 · XSS via data-template attribute' },
      { cve: 'CVE-2021-23337', detail: 'Lodash < 4.17.21 · Command injection via template' },
    ],
  },
  {
    icon: <Bug size={24} />,
    color: '#f87171',
    bg: 'rgba(248,113,113,0.08)',
    border: 'rgba(248,113,113,0.18)',
    name: 'GSAP CVE-2020-28478',
    tagline: 'Prototype pollution — targeted scanner',
    source: 'NVD · CVE-2020-28478',
    sourceLabel: 'Port of original PoC',
    coverage: 'GSAP < 3.6.0',
    what: [
      'Prototype pollution vulnerability in GreenSock Animation Platform (GSAP) versions prior to 3.6.0',
      'The flaw allows an attacker to modify Object.prototype via specially crafted animation property values, potentially enabling server-side RCE in Node/SSR contexts',
      'Detects TweenLite, TweenMax, ScrollTrigger, and all GSAP 2.x/3.x entry points',
    ],
    how: 'The scanner extracts version strings from GSAP source files using the embedded version comment pattern (e.g. "gsap 3.x.x"). If the detected version is below 3.6.0, the file is flagged with a critical severity finding. This is a port of the original bash proof-of-concept scanner adapted to run entirely in the browser against fetched file content, with no external API call required.',
    examples: [
      { cve: 'CVE-2020-28478', detail: 'GSAP < 3.6.0 · Object.prototype pollution via gsap.set()' },
    ],
  },
  {
    icon: <Globe size={24} />,
    color: '#60a5fa',
    bg: 'rgba(96,165,250,0.08)',
    border: 'rgba(96,165,250,0.18)',
    name: 'OSV.dev',
    tagline: 'Open Source Vulnerability database cross-check',
    source: 'osv.dev · Google Open Source Security',
    sourceLabel: 'Batch REST API',
    coverage: 'npm + GitHub Advisory Database',
    what: [
      'Additional CVEs beyond what retire.js covers, sourced from the Google Open Source Vulnerabilities (OSV) database which aggregates GitHub Advisory Database, npm advisories, and NVD',
      'Catches advisories published after the retire.js database was last updated, reducing the lag between CVE publication and detection',
      'Queries every library and version detected in previous scanner passes, acting as a second-opinion layer',
    ],
    how: 'After retire.js and the GSAP scanner run, all detected library-version pairs are submitted as a single batch request to the OSV.dev /v1/querybatch endpoint. The API returns any vulnerability records for those exact versions in the npm ecosystem. Findings not already reported by retire.js are added to the results. OSV.dev has no rate limits and is operated by Google, making it reliable for browser-based use without a backend.',
    examples: [
      { cve: 'GHSA-jfh8-c2jp-hdp8', detail: 'axios < 1.6.0 · CSRF via cross-site request' },
      { cve: 'GHSA-rv95-896h-c2vc', detail: 'follow-redirects · URL redirection to untrusted site' },
    ],
  },
  {
    icon: <Lock size={24} />,
    color: '#fbbf24',
    bg: 'rgba(251,191,36,0.08)',
    border: 'rgba(251,191,36,0.18)',
    name: 'SRI Checker',
    tagline: 'Subresource Integrity audit',
    source: 'W3C SRI spec · HTML parsing',
    sourceLabel: 'Static HTML analysis',
    coverage: 'All external scripts and stylesheets',
    what: [
      'External <script src> and <link rel="stylesheet"> tags that load from third-party CDNs (cdnjs, jsDelivr, unpkg, polyfill.io, and others) without a valid integrity attribute',
      'Missing crossorigin="anonymous" attribute, which is required for SRI enforcement to work correctly in browsers',
      'Explicit detection of polyfill.io and cdn.polyfill.io — the CDN compromised in the 2024 supply-chain attack that injected malware into 100,000+ websites',
    ],
    how: 'The scanner parses the raw HTML of the target page and extracts all <script> and <link> tags with external src/href attributes. For each tag it checks for the presence of a valid integrity attribute (e.g. integrity="sha384-...") and a crossorigin attribute. Tags without SRI are flagged with medium severity. Without SRI, a compromised CDN or domain hijack silently delivers malicious code to every user of the page, bypassing HTTPS.',
    examples: [
      { cve: 'CVE-2024-38526', detail: 'polyfill.io CDN · Malicious JS injection on mobile devices' },
      { cve: 'CWE-829', detail: 'External resource loaded from untrusted CDN without integrity hash' },
    ],
  },
  {
    icon: <Key size={24} />,
    color: '#a78bfa',
    bg: 'rgba(167,139,250,0.08)',
    border: 'rgba(167,139,250,0.18)',
    name: 'Secrets Scanner',
    tagline: 'Hardcoded credential detection',
    source: 'Custom regex engine',
    sourceLabel: 'Pattern + entropy analysis',
    coverage: '10+ credential types',
    what: [
      'Google API keys (AIza... prefix), Maps API keys, Firebase credentials',
      'AWS access key IDs (AKIA... prefix) and secret access keys',
      'Stripe publishable and secret keys (pk_live_, sk_live_, rk_live_)',
      'Bearer tokens, JSON Web Tokens (JWT), and generic high-entropy strings matching credential patterns',
      'RSA and EC private key PEM blocks (-----BEGIN ... PRIVATE KEY-----)',
    ],
    how: 'Each JS file is scanned line-by-line against a set of high-precision regular expressions tuned to the format of known credential types. Patterns are anchored to specific prefixes and character classes to minimise false positives (e.g. AWS key IDs always start with AKIA, AGPA, AIDA, AROA, or AIPA followed by exactly 16 uppercase alphanumeric characters). Findings are reported with the matched pattern type, affected file, and line context without exposing the full secret value in the UI.',
    examples: [
      { cve: 'CWE-798', detail: 'Hardcoded AWS AKIA key detected in bundle.js' },
      { cve: 'CWE-321', detail: 'Stripe sk_live_ secret key exposed in client-side code' },
      { cve: 'CWE-312', detail: 'JWT bearer token stored in cleartext JS file' },
    ],
  },
];

const STEPS = [
  {
    n: '01',
    title: 'Paste your token',
    body: 'GitHub, GitLab, Bitbucket, or just a public URL. No account, no registration.',
    note: 'Token never leaves your browser',
  },
  {
    n: '02',
    title: 'Click Scan',
    body: 'Five scanners run in sequence directly from your browser. Takes 30 seconds to a few minutes.',
    note: 'Everything runs client-side',
  },
  {
    n: '03',
    title: 'Read the report',
    body: 'Severity-ranked findings with CVE links, affected file paths, and direct download links to safe versions on cdnjs and jsDelivr.',
    note: 'Export for Teams / Slack',
  },
];

export function HomeView({ onStartScan }: Props) {
  const [provider, setProvider] = useState<Provider>('github');
  const [token, setToken] = useState('');
  const [repoUrl, setRepoUrl] = useState('');
  const [siteUrl, setSiteUrl] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [additionalPaths, setAdditionalPaths] = useState('');
  const [corsProxy, setCorsProxy] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showTokenSuggestions, setShowTokenSuggestions] = useState(false);
  const tokenInputRef = useRef<HTMLDivElement>(null);

  const savedTokens = getTokens(provider);

  // close suggestion dropdown on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (tokenInputRef.current && !tokenInputRef.current.contains(e.target as Node)) {
        setShowTokenSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const isPublic = provider === 'publicUrl';
  const canSubmit = isPublic
    ? siteUrl.trim().length > 0 || additionalPaths.trim().length > 0
    : repoUrl.trim().length > 0;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    if (!isPublic && token.trim()) saveToken(provider, token.trim());
    onStartScan({
      provider,
      token: isPublic ? undefined : token || undefined,
      repoUrl: isPublic ? undefined : repoUrl,
      siteUrl: isPublic ? siteUrl || undefined : undefined,
      additionalPaths: isPublic ? additionalPaths || undefined : undefined,
      corsProxy: isPublic ? corsProxy : undefined,
    });
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-base)', overflowX: 'hidden' }}>

      {/* ── Nav ── */}
      <div style={{ height: '56px', flexShrink: 0 }} />
      <nav style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        background: 'rgba(10,10,15,0.85)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--border)',
        padding: '0 24px',
      }}>
        <div style={{
          maxWidth: '1100px',
          margin: '0 auto',
          height: '56px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <a
            href="#"
            onClick={e => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); setMenuOpen(false); }}
            style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}
            aria-label="Go to top"
          >
            <JSRadarLogo height={38} />
          </a>

          {/* Desktop links */}
          <div className="nav-desktop" style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
            <a href="#scanners" style={{ fontSize: '13px', color: 'var(--text-secondary)', textDecoration: 'none' }}
              onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-primary)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-secondary)')}>
              Scanners
            </a>
            <a href="#coverage" style={{ fontSize: '13px', color: 'var(--text-secondary)', textDecoration: 'none' }}
              onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-primary)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-secondary)')}>
              Coverage
            </a>
            <a href="#how-it-works" style={{ fontSize: '13px', color: 'var(--text-secondary)', textDecoration: 'none' }}
              onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-primary)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-secondary)')}>
              How it works
            </a>
            <a href="#scan" className="btn-primary" style={{ padding: '7px 16px', fontSize: '13px' }}>
              Start scanning
            </a>
          </div>

          {/* Mobile hamburger */}
          <button
            className="nav-hamburger"
            aria-label="Toggle menu"
            onClick={() => setMenuOpen(o => !o)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-primary)',
              padding: '6px',
              display: 'flex',
              flexDirection: 'column',
              gap: '5px',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <span style={{ display: 'block', width: '22px', height: '2px', background: menuOpen ? 'var(--accent-green)' : 'currentColor', borderRadius: '2px', transition: '150ms', transform: menuOpen ? 'translateY(7px) rotate(45deg)' : 'none' }} />
            <span style={{ display: 'block', width: '22px', height: '2px', background: 'currentColor', borderRadius: '2px', transition: '150ms', opacity: menuOpen ? 0 : 1 }} />
            <span style={{ display: 'block', width: '22px', height: '2px', background: menuOpen ? 'var(--accent-green)' : 'currentColor', borderRadius: '2px', transition: '150ms', transform: menuOpen ? 'translateY(-7px) rotate(-45deg)' : 'none' }} />
          </button>
        </div>

        {/* Mobile dropdown */}
        {menuOpen && (
          <div className="nav-mobile-menu" style={{
            borderTop: '1px solid var(--border)',
            padding: '16px 24px 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}>
            <a href="#scanners" onClick={() => setMenuOpen(false)}
              style={{ fontSize: '15px', color: 'var(--text-secondary)', textDecoration: 'none' }}>
              Scanners
            </a>
            <a href="#coverage" onClick={() => setMenuOpen(false)}
              style={{ fontSize: '15px', color: 'var(--text-secondary)', textDecoration: 'none' }}>
              Coverage
            </a>
            <a href="#how-it-works" onClick={() => setMenuOpen(false)}
              style={{ fontSize: '15px', color: 'var(--text-secondary)', textDecoration: 'none' }}>
              How it works
            </a>
            <a href="#scan" onClick={() => setMenuOpen(false)}
              className="btn-primary"
              style={{ textAlign: 'center', fontSize: '14px', padding: '10px 16px', textDecoration: 'none' }}>
              Start scanning
            </a>
          </div>
        )}
      </nav>

      {/* ── Hero ── */}
      <section style={{
        padding: '80px 24px 64px',
        background: `
          radial-gradient(ellipse 80% 40% at 50% -10%, rgba(110,231,183,0.07) 0%, transparent 70%),
          radial-gradient(rgba(110,231,183,0.05) 1px, transparent 1px)
        `,
        backgroundSize: 'auto, 28px 28px',
        textAlign: 'center',
      }}>
        <div style={{ maxWidth: '700px', margin: '0 auto' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            background: 'rgba(110,231,183,0.08)',
            border: '1px solid rgba(110,231,183,0.20)',
            borderRadius: '20px',
            padding: '4px 14px',
            fontSize: '12px',
            color: 'var(--accent-green)',
            fontWeight: 500,
            marginBottom: '28px',
          }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent-green)', display: 'inline-block' }} />
            Free · No account · Zero backend
          </div>

          <h1 style={{
            fontFamily: 'Inter, sans-serif',
            fontSize: 'clamp(32px, 5vw, 52px)',
            fontWeight: 700,
            color: 'var(--text-primary)',
            margin: '0 0 20px',
            lineHeight: 1.15,
            letterSpacing: '-1px',
          }}>
            Find JS vulnerabilities<br />
            <span style={{ color: 'var(--accent-green)' }}>before attackers do</span>
          </h1>

          <p style={{
            fontSize: '17px',
            color: 'var(--text-secondary)',
            margin: '0 auto 40px',
            maxWidth: '520px',
            lineHeight: 1.65,
          }}>
            Scan any GitHub, GitLab, or Bitbucket repository or any public web page
            for known CVEs, prototype pollution, missing SRI, and hardcoded secrets.
            Runs entirely in your browser.
          </p>

          {/* Trust strip */}
          <div style={{ display: 'flex', gap: '32px', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '56px' }}>
            {[
              { n: '5', label: 'scanners' },
              { n: '500+', label: 'libraries covered' },
              { n: '0', label: 'servers' },
            ].map(({ n, label }) => (
              <div key={label} style={{ textAlign: 'center' }}>
                <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '28px', fontWeight: 700, color: 'var(--accent-green)', lineHeight: 1 }}>
                  {n}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>{label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Scan form ── */}
        <div id="scan" style={{ maxWidth: '580px', margin: '0 auto' }}>
          <div className="card" style={{ padding: '28px', textAlign: 'left' }}>
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '20px' }}>
                <ProviderSelector
                  selected={provider}
                  onChange={p => { setProvider(p); setToken(''); setRepoUrl(''); setSiteUrl(''); setAdditionalPaths(''); setCorsProxy(false); setShowAdvanced(false); }}
                />
              </div>

              {isPublic ? (
                <>
                  <div style={{ marginBottom: '14px' }}>
                    <label htmlFor="site-url" style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Site URL <span style={{ color: 'var(--text-muted)', textTransform: 'none', letterSpacing: 0, fontWeight: 400 }}>(optional if using paths below)</span>
                    </label>
                    <input id="site-url" type="url" className="input-field input-mono"
                      placeholder="https://example.com" value={siteUrl}
                      onChange={e => setSiteUrl(e.target.value)} autoComplete="off" spellCheck={false} />
                  </div>
                  <button type="button" onClick={() => setShowAdvanced(s => !s)}
                    style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '12px', cursor: 'pointer', padding: '0', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ fontSize: '9px', transform: showAdvanced ? 'rotate(90deg)' : 'none', transition: '150ms', display: 'inline-block' }}>▶</span>
                    Advanced options
                  </button>
                  {showAdvanced && (
                    <div style={{ background: 'var(--bg-base)', border: '1px solid var(--border)', borderRadius: '8px', padding: '16px', marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                      <div>
                        <label htmlFor="additional-paths" style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px', fontWeight: 500 }}>
                          Additional JS file URLs <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(one per line)</span>
                        </label>
                        <textarea id="additional-paths" className="input-field input-mono" rows={3}
                          placeholder="https://example.com/themes/custom/js/lib.min.js"
                          value={additionalPaths} onChange={e => setAdditionalPaths(e.target.value)}
                          autoComplete="off" spellCheck={false} style={{ resize: 'vertical', fontSize: '12px' }} />
                      </div>
                      <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer' }}>
                        <input type="checkbox" checked={corsProxy} onChange={e => setCorsProxy(e.target.checked)}
                          style={{ marginTop: '2px', accentColor: 'var(--accent-green)', flexShrink: 0 }} />
                        <span>
                          <span style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: 500 }}>Use CORS proxy (corsproxy.io)</span><br />
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: '1.5' }}>Bypasses CORS restrictions. File URLs visible to corsproxy.io. No credentials sent.</span>
                        </span>
                      </label>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div style={{ marginBottom: '14px' }} ref={tokenInputRef}>
                    <label htmlFor="access-token" style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Personal Access Token
                      {savedTokens.length > 0 && (
                        <button type="button" onClick={() => setShowTokenSuggestions(s => !s)}
                          style={{ marginLeft: '8px', background: 'rgba(110,231,183,0.10)', border: '1px solid rgba(110,231,183,0.25)', borderRadius: '4px', color: 'var(--accent-green)', fontSize: '10px', padding: '1px 7px', cursor: 'pointer', fontWeight: 600, letterSpacing: '0.3px', textTransform: 'none' }}>
                          {savedTokens.length} saved ▾
                        </button>
                      )}
                    </label>

                    {/* Saved token suggestions dropdown */}
                    {showTokenSuggestions && savedTokens.length > 0 && (
                      <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '8px', marginBottom: '8px', overflow: 'hidden' }}>
                        {savedTokens.map((st, i) => (
                          <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', borderBottom: i < savedTokens.length - 1 ? '1px solid var(--border)' : 'none', gap: '8px' }}>
                            <button type="button"
                              onClick={() => { setToken(st.token); setShowTokenSuggestions(false); }}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'IBM Plex Mono, monospace', fontSize: '13px', color: 'var(--text-primary)', padding: '0', textAlign: 'left', flex: 1 }}>
                              {st.label}
                            </button>
                            <button type="button"
                              onClick={() => { deleteToken(provider, st.token); setShowTokenSuggestions(false); if (token === st.token) setToken(''); }}
                              title="Remove saved token"
                              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '14px', padding: '0 2px', lineHeight: 1 }}>
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    <div style={{ position: 'relative' }}>
                      <input id="access-token" type={showToken ? 'text' : 'password'}
                        className="input-field input-mono"
                        placeholder="••••••••••••••••••••••••••••••••"
                        value={token} onChange={e => setToken(e.target.value)}
                        autoComplete="off" spellCheck={false} style={{ paddingRight: '44px' }} />
                      <button type="button" aria-label={showToken ? 'Hide token' : 'Show token'}
                        onClick={() => setShowToken(s => !s)}
                        style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '4px', display: 'flex', alignItems: 'center' }}>
                        {showToken ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                    {TOKEN_HELP[provider] && (
                      <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '5px', lineHeight: '1.5' }}>{TOKEN_HELP[provider]}</p>
                    )}
                    <p style={{
                      fontSize: '11px',
                      color: 'var(--text-muted)',
                      marginTop: '6px',
                      lineHeight: '1.5',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '5px',
                    }}>
                      <span style={{ color: 'var(--accent-green)', flexShrink: 0 }}>🔒</span>
                      Tokens are saved only in your browser (localStorage) to speed up future scans. You can remove them at any time using the saved list above.
                    </p>
                  </div>
                  <div style={{ marginBottom: '14px' }}>
                    <label htmlFor="repo-url" style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Repository URL
                    </label>
                    <input id="repo-url" type="url" className="input-field input-mono"
                      placeholder={PLACEHOLDERS[provider]} value={repoUrl}
                      onChange={e => setRepoUrl(e.target.value)} autoComplete="off" spellCheck={false} />
                  </div>
                </>
              )}

              <button type="submit" className="btn-primary" disabled={!canSubmit}
                style={{ width: '100%', fontSize: '15px', padding: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                Start Scan <ArrowRight size={16} />
              </button>
            </form>
          </div>
          <p style={{ textAlign: 'center', fontSize: '11px', color: 'var(--text-muted)', marginTop: '14px', lineHeight: 1.6 }}>
            🔒 Token used only to call the provider API directly from your browser. Never sent to any server. We have no servers.
          </p>
        </div>
      </section>

      {/* ── Scanners ── */}
      <section id="scanners" className="landing-section">
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '52px' }}>
            <p style={{ fontSize: '12px', color: 'var(--accent-green)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '12px' }}>
              What gets scanned
            </p>
            <h2 style={{ fontSize: 'clamp(24px, 3vw, 36px)', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 12px', letterSpacing: '-0.5px' }}>
              5 scanners. One click.
            </h2>
            <p style={{ fontSize: '15px', color: 'var(--text-secondary)', margin: '0 auto', maxWidth: '480px' }}>
              Each scanner runs independently. A failure in one never blocks the others.
            </p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            {SCANNERS.map(s => (
              <div key={s.name} className="card" style={{ padding: '24px' }}>
                <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: s.color, marginBottom: '16px' }}>
                  {s.icon}
                </div>
                <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>
                  {s.name}
                </div>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.6 }}>
                  {s.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Scanner Deep Dive ── */}
      <section id="coverage" className="landing-section">
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '60px' }}>
            <p style={{ fontSize: '12px', color: 'var(--accent-green)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '12px' }}>
              Technical coverage
            </p>
            <h2 style={{ fontSize: 'clamp(24px, 3vw, 36px)', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 14px', letterSpacing: '-0.5px' }}>
              What each scanner detects and how
            </h2>
            <p style={{ fontSize: '15px', color: 'var(--text-secondary)', margin: '0 auto', maxWidth: '560px', lineHeight: 1.65 }}>
              Each engine runs independently with a distinct data source and detection strategy. Below is a full technical breakdown of coverage, methodology, and example findings.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {SCANNER_DETAILS.map((s) => (
              <div key={s.name} style={{
                background: 'var(--bg-surface)',
                border: `1px solid var(--border)`,
                borderRadius: '16px',
                overflow: 'hidden',
              }}>
                {/* Card header strip */}
                <div style={{
                  borderBottom: `1px solid ${s.border}`,
                  background: s.bg,
                  padding: '20px 28px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  flexWrap: 'wrap',
                }}>
                  <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: s.bg, border: `1px solid ${s.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: s.color, flexShrink: 0 }}>
                    {s.icon}
                  </div>
                  <div style={{ flex: 1, minWidth: '200px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '3px' }}>
                      <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {s.name}
                      </span>
                      <span style={{ fontSize: '12px', color: s.color, background: s.bg, border: `1px solid ${s.border}`, borderRadius: '4px', padding: '1px 8px', fontWeight: 500 }}>
                        {s.coverage}
                      </span>
                    </div>
                    <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{s.tagline}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px', flexShrink: 0 }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'IBM Plex Mono, monospace' }}>{s.sourceLabel}</span>
                    <span style={{ fontSize: '11px', color: s.color, opacity: 0.8 }}>{s.source}</span>
                  </div>
                </div>

                {/* Card body */}
                <div style={{ padding: '24px 28px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '28px' }}>
                  {/* What it detects */}
                  <div>
                    <p style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '14px' }}>
                      What it detects
                    </p>
                    <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {s.what.map((item, i) => (
                        <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                          <span style={{ color: s.color, flexShrink: 0, marginTop: '4px', fontSize: '10px' }}>◆</span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* How it works + examples */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div>
                      <p style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px' }}>
                        Detection methodology
                      </p>
                      <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.75, margin: 0 }}>
                        {s.how}
                      </p>
                    </div>
                    <div>
                      <p style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px' }}>
                        Example findings
                      </p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {s.examples.map((ex, i) => (
                          <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '6px', padding: '8px 12px' }}>
                            <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '11px', color: s.color, flexShrink: 0, fontWeight: 600, marginTop: '1px' }}>{ex.cve}</span>
                            <span style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.5 }}>{ex.detail}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Research roadmap note */}
          <div style={{
            marginTop: '40px',
            background: 'linear-gradient(135deg, rgba(96,165,250,0.05) 0%, rgba(167,139,250,0.05) 100%)',
            border: '1px solid rgba(96,165,250,0.15)',
            borderRadius: '12px',
            padding: '24px 28px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '16px',
          }}>
            <span style={{ fontSize: '20px', flexShrink: 0 }}>🔬</span>
            <div>
              <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 6px' }}>
                Research pipeline
              </p>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.7 }}>
                Based on active 2025 security research, the following capabilities are under evaluation:{' '}
                <span style={{ color: 'var(--accent-blue)' }}>DOM Clobbering gadget detection</span> (USENIX Security 2025),{' '}
                <span style={{ color: 'var(--accent-blue)' }}>ReDoS pattern analysis</span> via catastrophic backtracking detection in bundled regex,{' '}
                <span style={{ color: 'var(--accent-blue)' }}>GitHub Advisory Database re-check</span> to flag previously-safe versions newly marked as vulnerable,{' '}
                and <span style={{ color: 'var(--accent-blue)' }}>CSP header auditing</span> for unsafe-inline and unsafe-eval directives.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section id="how-it-works" className="landing-section" style={{ background: 'var(--bg-surface)' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '52px' }}>
            <p style={{ fontSize: '12px', color: 'var(--accent-blue)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '12px' }}>
              How it works
            </p>
            <h2 style={{ fontSize: 'clamp(24px, 3vw, 36px)', fontWeight: 700, color: 'var(--text-primary)', margin: '0', letterSpacing: '-0.5px' }}>
              Scan in three steps
            </h2>
          </div>
          <div className="steps-grid">
            {STEPS.map((step, i) => (
              <React.Fragment key={step.n}>
                <div style={{ padding: '28px 24px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '12px' }}>
                  <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '11px', color: 'var(--accent-green)', fontWeight: 600, marginBottom: '14px', letterSpacing: '1px' }}>
                    STEP {step.n}
                  </div>
                  <h3 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 10px', letterSpacing: '-0.3px' }}>
                    {step.title}
                  </h3>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '0 0 14px', lineHeight: 1.65 }}>
                    {step.body}
                  </p>
                  <span style={{ fontSize: '11px', color: 'var(--accent-green)', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'var(--accent-green)', display: 'inline-block', flexShrink: 0 }} />
                    {step.note}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className="step-chevron">
                    <ChevronRight size={20} />
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      </section>

      {/* ── Privacy banner ── */}
      <section className="landing-section">
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <div style={{
            background: 'linear-gradient(135deg, rgba(110,231,183,0.05) 0%, rgba(96,165,250,0.05) 100%)',
            border: '1px solid rgba(110,231,183,0.15)',
            borderRadius: '16px',
            padding: 'clamp(28px, 5vw, 52px) clamp(20px, 5vw, 48px)',
          }}>
            <div className="privacy-grid">
            <div>
              <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '11px', color: 'var(--accent-green)', fontWeight: 600, letterSpacing: '1.5px', marginBottom: '16px' }}>
                PRIVACY FIRST
              </div>
              <h2 style={{ fontSize: 'clamp(22px, 3vw, 32px)', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 16px', letterSpacing: '-0.5px', lineHeight: 1.25 }}>
                We have no servers.<br />
                <span style={{ color: 'var(--accent-green)' }}>Literally.</span>
              </h2>
              <p style={{ fontSize: '15px', color: 'var(--text-secondary)', margin: '0 0 24px', lineHeight: 1.65 }}>
                JSRadar is a static HTML file. Your token is never transmitted to us.
                Every API call goes directly from your browser to the provider.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {[
                  'Token only sent to GitHub / GitLab / Bitbucket API',
                  'CVE lookups go directly to OSV.dev',
                  'No analytics, no logging, no cookies',
                  'Deploy your own copy, it\'s just a static file',
                ].map(item => (
                  <div key={item} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                    <span style={{ color: 'var(--accent-green)', marginTop: '1px', flexShrink: 0 }}>✓</span>
                    {item}
                  </div>
                ))}
              </div>
            </div>
            <div>
              <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '12px', background: 'var(--bg-base)', border: '1px solid var(--border)', borderRadius: '10px', padding: '24px', lineHeight: 2.2 }}>
                <div style={{ color: 'var(--text-muted)', marginBottom: '4px', fontSize: '11px' }}>// data flow</div>
                <div>
                  <span style={{ color: 'var(--accent-blue)' }}>Browser</span>
                  <span style={{ color: 'var(--text-muted)' }}> → </span>
                  <span style={{ color: 'var(--accent-green)' }}>GitHub API</span>
                </div>
                <div>
                  <span style={{ color: 'var(--accent-blue)' }}>Browser</span>
                  <span style={{ color: 'var(--text-muted)' }}> → </span>
                  <span style={{ color: 'var(--accent-green)' }}>OSV.dev</span>
                </div>
                <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--border)' }}>
                  <span style={{ color: 'var(--accent-blue)' }}>Browser</span>
                  <span style={{ color: 'var(--text-muted)' }}> → </span>
                  <span style={{ color: 'var(--accent-red)', textDecoration: 'line-through' }}>JSRadar servers</span>
                  <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}> // doesn't exist</span>
                </div>
              </div>
            </div>
            </div>{/* end privacy-grid */}
          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="landing-section" style={{ textAlign: 'center', background: 'var(--bg-surface)' }}>
        <div style={{ maxWidth: '500px', margin: '0 auto' }}>
          <h2 style={{ fontSize: 'clamp(22px, 3vw, 32px)', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 16px', letterSpacing: '-0.5px' }}>
            Ready to scan?
          </h2>
          <p style={{ fontSize: '15px', color: 'var(--text-secondary)', margin: '0 0 32px' }}>
            No signup. No credit card. Completely free.
          </p>
          <a href="#scan" className="btn-primary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '15px', padding: '14px 32px', textDecoration: 'none' }}>
            Start scanning now <ArrowRight size={16} />
          </a>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer style={{ borderTop: '1px solid var(--border)', padding: '24px', textAlign: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '24px', flexWrap: 'wrap' }}>
          <JSRadarLogo height={28} />
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Free forever · No account · No backend
          </span>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Powered by retire.js · OSV.dev · corsproxy.io
          </span>
        </div>
      </footer>
    </div>
  );
}
