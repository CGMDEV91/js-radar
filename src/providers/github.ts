import axios from 'axios';
import type { ScannedFile, ProviderConfig } from '../types';

interface TreeItem {
  path: string;
  type: string;
  size?: number;
  url?: string;
  sha?: string;
}

interface TreeResponse {
  tree: TreeItem[];
  truncated?: boolean;
}

function parseGithubUrl(url: string): { org: string; repo: string } {
  const match = url.match(/github\.com\/([^/]+)\/([^/]+?)(?:\.git)?\/?$/);
  if (!match) throw new Error('Invalid GitHub URL. Expected: https://github.com/org/repo');
  return { org: match[1], repo: match[2] };
}

function isSkipped(path: string, size?: number): boolean {
  if (size && size > 500_000) return true;
  const lower = path.toLowerCase();
  return (
    lower.includes('node_modules/') ||
    lower.includes('.git/') ||
    lower.includes('/vendor/') ||
    lower.includes('/test/') ||
    lower.includes('/tests/') ||
    lower.includes('/spec/')
  );
}

export async function fetchFromGithub(
  config: ProviderConfig,
  onProgress: (msg: string) => void,
): Promise<ScannedFile[]> {
  const { org, repo } = parseGithubUrl(config.repoUrl ?? '');
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github.v3+json',
  };
  if (config.token) {
    headers['Authorization'] = `token ${config.token}`;
  }

  onProgress(`📂 Fetching file tree for ${org}/${repo}...`);

  let treeData: TreeResponse;
  try {
    const treeResp = await axios.get<TreeResponse>(
      `https://api.github.com/repos/${org}/${repo}/git/trees/HEAD?recursive=1`,
      { headers, timeout: 30000 },
    );
    treeData = treeResp.data;
  } catch (e) {
    if (axios.isAxiosError(e)) {
      const status = e.response?.status;
      if (status === 401) throw new Error('Invalid token or private repo — check your access token has repo read scope.');
      if (status === 403) throw new Error('Rate limit exceeded — wait a moment and retry.');
      if (status === 404) throw new Error('Repository not found. Check the URL is correct.');
    }
    throw new Error(`Network error fetching repository: ${(e as Error).message}`);
  }

  const jsFiles = treeData.tree.filter(
    (item) =>
      item.type === 'blob' &&
      item.path.endsWith('.js') &&
      !isSkipped(item.path, item.size),
  );

  onProgress(`📦 Found ${jsFiles.length} JavaScript files to download...`);

  const files: ScannedFile[] = [];
  let remaining = Infinity;

  for (let i = 0; i < jsFiles.length; i++) {
    const item = jsFiles[i];
    if (remaining < 5) {
      onProgress(`⚠ GitHub rate limit low — stopping file download early`);
      break;
    }

    try {
      // Use Contents API (CORS-safe) instead of raw.githubusercontent.com
      const contentsResp = await axios.get<{ content: string; encoding: string }>(
        `https://api.github.com/repos/${org}/${repo}/contents/${item.path}`,
        { headers, timeout: 15000 },
      );

      const rateLimitHeader = contentsResp.headers['x-ratelimit-remaining'];
      if (rateLimitHeader) remaining = parseInt(rateLimitHeader, 10);

      const raw = contentsResp.data;
      const content =
        raw.encoding === 'base64'
          ? atob(raw.content.replace(/\n/g, ''))
          : raw.content;

      files.push({ path: item.path, content, fetchStatus: 'ok' });

      if ((i + 1) % 10 === 0) {
        onProgress(`⬇ Downloaded ${i + 1}/${jsFiles.length} files...`);
      }
    } catch (e) {
      const msg = axios.isAxiosError(e)
        ? `HTTP ${e.response?.status ?? 'error'}: ${e.response?.data?.message ?? e.message}`
        : (e as Error).message;
      onProgress(`⚠ Could not fetch ${item.path} — ${msg}`);
      files.push({ path: item.path, content: '', fetchStatus: 'error', fetchError: msg });
    }
  }

  return files;
}
