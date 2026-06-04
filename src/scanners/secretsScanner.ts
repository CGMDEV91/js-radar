import type { ScannedFile, Finding, EmitFn } from '../types';

interface SecretPattern {
  name: string;
  pattern: RegExp;
  severity: Finding['severity'];
}

const PATTERNS: SecretPattern[] = [
  {
    name: 'Google API Key',
    pattern: /AIza[0-9A-Za-z_-]{35}/g,
    severity: 'critical',
  },
  {
    name: 'AWS Access Key',
    pattern: /AKIA[0-9A-Z]{16}/g,
    severity: 'critical',
  },
  {
    name: 'Stripe Secret Key',
    pattern: /sk_(live|test)_[0-9a-zA-Z]{24}/g,
    severity: 'critical',
  },
  {
    name: 'API Key / Secret / Token',
    pattern: /(api[_-]?key|secret|token)\s*[:=]\s*["'][^"']{8,}/gi,
    severity: 'high',
  },
  {
    name: 'Bearer Token',
    pattern: /Bearer\s+[A-Za-z0-9_-]{20,}/g,
    severity: 'high',
  },
];

function isMinified(content: string): boolean {
  return content.length > 100_000 && !content.includes('\n');
}

const FALSE_POSITIVE_HINT =
  'Make sure this value is not a file include hash or an encoded list of assets ' +
  'injected by a build tool or server-side framework. Some applications embed ' +
  'compressed file manifests, cache keys, or request tokens in their JS that ' +
  'match secret patterns but are not sensitive credentials. ' +
  'Check whether the value changes between page loads before treating this as a real finding.';

/**
 * Returns a false-positive hint when the match context suggests a generated
 * token rather than a real hardcoded credential, or null if no hint applies.
 */
function getFalsePositiveHint(filePath: string, matchedLine: string): string | null {
  const path = filePath.toLowerCase();
  const line = matchedLine.toLowerCase();

  // File URL contains query parameters typical of server-side asset aggregation
  const hasAggregationParams = /[?&](scope|delta|include|token|nonce|hash|v|ver)=/.test(filePath);

  // Hashed filename pattern (long hex or base62 string in the filename itself)
  const hasHashedFilename = /[a-f0-9]{16,}|[A-Za-z0-9_-]{24,}\.(js|css)/.test(filePath);

  // Match line contains encoded or compressed content indicators
  const looksEncoded =
    line.includes('eJx') ||       // zlib base64 header
    line.includes('include') ||
    line.includes('manifest') ||
    line.includes('nonce') ||
    line.includes('cache');

  if (hasAggregationParams || (hasHashedFilename && looksEncoded)) {
    return FALSE_POSITIVE_HINT;
  }

  return null;
}

export async function secretsScanner(
  files: ScannedFile[],
  emit: EmitFn,
): Promise<Finding[]> {
  emit({ text: '🔑  Scanning for hardcoded secrets...', type: 'info' });

  const findings: Finding[] = [];
  let secretCount = 0;

  for (const file of files) {
    if (isMinified(file.content)) continue;

    for (const { name, pattern, severity } of PATTERNS) {
      pattern.lastIndex = 0;
      const matches = file.content.match(pattern);
      if (!matches) continue;

      secretCount++;

      const description = `Possible hardcoded ${name} detected in source file`;

      // Find the line containing the first match for false-positive analysis
      const firstMatch = matches[0];
      const matchLine = file.content
        .split('\n')
        .find((l) => l.includes(firstMatch.slice(0, 20))) ?? '';
      const hint = getFalsePositiveHint(file.originalUrl ?? file.path, matchLine);

      findings.push({
        scanner: 'secrets-scanner',
        file: file.path,
        library: name,
        detectedVersion: '',
        severity,
        cve: [],
        status: 'vulnerable',
        fixVersion: null,
        downloadUrls: {},
        isEol: false,
        alternative: null,
        description,
        hint: hint ?? undefined,
      });

      emit({
        text: `🔑  Possible ${name} found in ${file.path}`,
        type: 'error',
      });
    }
  }

  if (secretCount === 0) {
    emit({ text: '✅  Secrets scan: no hardcoded secrets found.', type: 'success' });
  } else {
    emit({ text: `⚠️  Secrets scan: ${secretCount} potential secret(s) found!`, type: 'error' });
  }

  return findings;
}
