import { Injectable } from '@nestjs/common';

interface VersionHit {
  count: number;
  lastSeen: Date;
}

@Injectable()
export class VersionAnalyticsService {
  private readonly hits = new Map<string, VersionHit>();

  record(version: string): void {
    const existing = this.hits.get(version);
    if (existing) {
      existing.count++;
      existing.lastSeen = new Date();
    } else {
      this.hits.set(version, { count: 1, lastSeen: new Date() });
    }
  }

  getStats(): Record<string, VersionHit> {
    return Object.fromEntries(this.hits);
  }
}
