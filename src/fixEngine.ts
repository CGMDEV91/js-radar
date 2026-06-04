import type { Finding } from './types';
import { versionLt } from './utils/semver';

interface EolEntry {
  condition: (lib: string, version: string) => boolean;
  fixVersion: string;
  alternative: string;
}

const EOL_ENTRIES: EolEntry[] = [
  {
    condition: (lib, ver) =>
      lib.toLowerCase() === 'jquery' && versionLt(ver, '3.0.0'),
    fixVersion: '3.7.1',
    alternative: 'jQuery 3.7.1 — no breaking changes for most apps',
  },
  {
    condition: (lib, ver) =>
      lib.toLowerCase() === 'bootstrap' && ver.startsWith('3.'),
    fixVersion: '5.3.3',
    alternative: 'Bootstrap 5.3 — note: class names changed',
  },
  {
    condition: (lib) => lib.toLowerCase() === 'moment',
    fixVersion: null as unknown as string,
    alternative: 'day.js — same API, 2KB instead of 67KB',
  },
];

export function getCdnjsUrl(lib: string, ver: string): string {
  const name = lib.toLowerCase();
  return `https://cdnjs.cloudflare.com/ajax/libs/${name}/${ver}/${name}.min.js`;
}

export function getJsdelivrUrl(lib: string, ver: string): string {
  const name = lib.toLowerCase();
  return `https://cdn.jsdelivr.net/npm/${name}@${ver}/dist/${name}.min.js`;
}

export function enrichWithFix(finding: Finding): Finding {
  const result = { ...finding };

  for (const entry of EOL_ENTRIES) {
    if (entry.condition(finding.library, finding.detectedVersion)) {
      result.isEol = true;
      result.alternative = entry.alternative;
      if (entry.fixVersion) {
        result.fixVersion = entry.fixVersion;
        result.downloadUrls = {
          cdnjs: getCdnjsUrl(finding.library, entry.fixVersion),
          jsdelivr: getJsdelivrUrl(finding.library, entry.fixVersion),
        };
      }
      return result;
    }
  }

  if (result.fixVersion) {
    result.downloadUrls = {
      cdnjs: getCdnjsUrl(finding.library, result.fixVersion),
      jsdelivr: getJsdelivrUrl(finding.library, result.fixVersion),
    };
  }

  return result;
}
