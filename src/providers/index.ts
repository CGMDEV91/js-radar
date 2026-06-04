import type { ScannedFile, ProviderConfig } from '../types';
import { fetchFromGithub } from './github';
import { fetchFromGitlab } from './gitlab';
import { fetchFromBitbucket } from './bitbucket';
import { fetchFromPublicUrl } from './publicUrl';

export async function fetchFiles(
  config: ProviderConfig,
  onProgress: (msg: string) => void,
  onFileProgress?: (fetched: number, total: number) => void,
): Promise<ScannedFile[]> {
  switch (config.provider) {
    case 'github':
      return fetchFromGithub(config, onProgress, onFileProgress);
    case 'gitlab':
      return fetchFromGitlab(config, onProgress, onFileProgress);
    case 'bitbucket':
      return fetchFromBitbucket(config, onProgress, onFileProgress);
    case 'publicUrl':
      return fetchFromPublicUrl(config, onProgress, onFileProgress);
    default:
      throw new Error(`Unknown provider: ${config.provider}`);
  }
}
