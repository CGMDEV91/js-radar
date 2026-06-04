import type { ScannedFile, ProviderConfig } from '../types';
import { fetchFromGithub } from './github';
import { fetchFromGitlab } from './gitlab';
import { fetchFromBitbucket } from './bitbucket';
import { fetchFromPublicUrl } from './publicUrl';

export async function fetchFiles(
  config: ProviderConfig,
  onProgress: (msg: string) => void,
): Promise<ScannedFile[]> {
  switch (config.provider) {
    case 'github':
      return fetchFromGithub(config, onProgress);
    case 'gitlab':
      return fetchFromGitlab(config, onProgress);
    case 'bitbucket':
      return fetchFromBitbucket(config, onProgress);
    case 'publicUrl':
      return fetchFromPublicUrl(config, onProgress);
    default:
      throw new Error(`Unknown provider: ${config.provider}`);
  }
}
