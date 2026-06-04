export function versionLt(a: string, b: string): boolean {
  const pa = a.split('.').map((x) => parseInt(x, 10) || 0);
  const pb = b.split('.').map((x) => parseInt(x, 10) || 0);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const va = pa[i] ?? 0;
    const vb = pb[i] ?? 0;
    if (va < vb) return true;
    if (va > vb) return false;
  }
  return false;
}

export function versionGte(a: string, b: string): boolean {
  return !versionLt(a, b);
}

export function normalizeVersion(v: string): string {
  return v.replace(/^[^0-9]*/, '').split(/[^0-9.]/)[0] ?? v;
}
