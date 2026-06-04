import type { Finding, EmitFn } from '../types';

const DANGEROUS_DOMAINS = ['polyfill.io', 'cdn.polyfill.io'];

const SCRIPT_SRC_RE =
  /<script[^>]+src=["'](https?:\/\/[^"']+)["'][^>]*>/gi;

function hasIntegrity(tag: string): boolean {
  return /\bintegrity\s*=/i.test(tag);
}

function getDomain(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return '';
  }
}

export function sriChecker(htmlContent: string, _pageUrl: string, emit: EmitFn): Finding[] {
  emit({ text: '🔗  Checking for missing Subresource Integrity...', type: 'info' });

  const findings: Finding[] = [];
  let match: RegExpExecArray | null;

  SCRIPT_SRC_RE.lastIndex = 0;

  while ((match = SCRIPT_SRC_RE.exec(htmlContent)) !== null) {
    const tag = match[0];
    const url = match[1];

    if (hasIntegrity(tag)) continue;

    const domain = getDomain(url);
    const isDangerous = DANGEROUS_DOMAINS.some(
      (d) => domain === d || domain.endsWith('.' + d),
    );

    const severity: Finding['severity'] = isDangerous ? 'high' : 'medium';
    const description = isDangerous
      ? `Script from ${domain} — known supply-chain attack vector. Add integrity= attribute or self-host.`
      : `No integrity= attribute. Add SRI hash to verify the script hasn't been tampered with.`;

    findings.push({
      scanner: 'sri-checker',
      file: url,
      library: domain,
      detectedVersion: '',
      severity,
      cve: [],
      status: isDangerous ? 'vulnerable' : 'info',
      fixVersion: null,
      downloadUrls: {},
      isEol: false,
      alternative: null,
      description,
    });

    emit({
      text: `⚠️  Missing SRI on ${url}${isDangerous ? ' (DANGEROUS DOMAIN)' : ''}`,
      type: isDangerous ? 'error' : 'warning',
    });
  }

  if (findings.length === 0) {
    emit({ text: '✅  SRI check: all external scripts have integrity attributes.', type: 'success' });
  }

  return findings;
}
