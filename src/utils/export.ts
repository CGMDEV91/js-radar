import type { Finding } from '../types';

const SEP = '════════════════════════════════════════════════════';

function severityLabel(s: Finding['severity']): string {
  const map: Record<Finding['severity'], string> = {
    critical: '✗ CRITICAL',
    high: '↑ HIGH',
    medium: '⚠ MEDIUM',
    low: '↓ LOW',
    info: 'ℹ INFO',
  };
  return map[s];
}

export function generateTeamsReport(
  repoUrl: string,
  findings: Finding[],
  filesScanned: number,
): string {
  const date = new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  const lines: string[] = [
    SEP,
    `JS Vulnerability Scan — ${repoUrl}`,
    `Scanned: ${date}`,
    SEP,
    '',
  ];

  if (findings.length === 0) {
    lines.push('✓ No vulnerabilities found.');
    lines.push('');
  } else {
    for (const f of findings) {
      lines.push(`${severityLabel(f.severity)} — ${f.library} ${f.detectedVersion}`);
      if (f.cve.length > 0) {
        lines.push(`  CVE: ${f.cve.join(', ')}`);
      }
      lines.push(`  File: ${f.file}`);
      lines.push(`  ${f.description}`);
      if (f.fixVersion) {
        lines.push(`  Fix: update to ${f.fixVersion}`);
      }
      if (f.isEol && f.alternative) {
        lines.push(`  ⚠ EOL — consider migrating to ${f.alternative}`);
      }
      lines.push('');
    }
  }

  const critCount = findings.filter((f) => f.severity === 'critical').length;
  const highCount = findings.filter((f) => f.severity === 'high').length;
  const medCount = findings.filter((f) => f.severity === 'medium').length;
  const lowCount = findings.filter((f) => f.severity === 'low').length;

  lines.push(SEP);
  lines.push(
    `Summary: ${filesScanned} files scanned · ${findings.length} findings` +
      (findings.length > 0
        ? ` (${critCount} critical, ${highCount} high, ${medCount} medium, ${lowCount} low)`
        : ''),
  );
  lines.push(`Scanned with JSRadar - ${window.location.href}`);
  lines.push(SEP);

  return lines.join('\n');
}
