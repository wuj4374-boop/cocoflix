export { ISourceAdapter, BaseAdapter } from './base.adapter';
export { M3u8Adapter } from './m3u8.adapter';
export { CloudAdapter } from './cloud.adapter';
export { AnimeAdapter } from './anime.adapter';

import { M3u8Adapter } from './m3u8.adapter';
import { CloudAdapter } from './cloud.adapter';
import { AnimeAdapter } from './anime.adapter';
import { SourceType, SourceConfig } from '../types';
import { BaseAdapter } from './base.adapter';

type AdapterConstructor = new (config: SourceConfig) => BaseAdapter;

const adapterRegistry: Map<string, AdapterConstructor> = new Map([
  [SourceType.M3U8, M3u8Adapter as unknown as AdapterConstructor],
  [SourceType.CLOUD, CloudAdapter as unknown as AdapterConstructor],
  [SourceType.ANIME, AnimeAdapter as unknown as AdapterConstructor],
]);

export function createAdapter(config: SourceConfig): BaseAdapter {
  const AdapterClass = adapterRegistry.get(config.type);
  if (!AdapterClass) {
    throw new Error(`No adapter registered for source type: ${config.type}`);
  }
  return new AdapterClass(config);
}

export function registerAdapter(type: string, adapterClass: AdapterConstructor): void {
  adapterRegistry.set(type, adapterClass);
}

export function getRegisteredAdapterTypes(): string[] {
  return Array.from(adapterRegistry.keys());
}
