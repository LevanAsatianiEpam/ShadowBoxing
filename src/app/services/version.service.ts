import { Injectable } from '@angular/core';
import packageInfo from '../../../package.json';

export interface VersionInfo {
  major: number;
  minor: number;
  patch: number;
  releaseDate: Date;
  changes: string[];
}

@Injectable({
  providedIn: 'root'
})
export class VersionService {
  private currentVersion: VersionInfo;
  private versionHistory: VersionInfo[] = [];

  constructor() {
    // Parse version from package.json
    const [major, minor, patch] = packageInfo.version.split('.').map(Number);

    this.currentVersion = {
      major,
      minor,
      patch,
      releaseDate: new Date('2025-04-20'),
      changes: [
        'Add versioning support and fixed some bugs'
      ]
    };

    // Initialize version history
    this.versionHistory = [this.currentVersion];
  }

  /**
   * Get the current version information
   */
  getCurrentVersion(): VersionInfo {
    return this.currentVersion;
  }

  /**
   * Get formatted version string (e.g., "1.0.0")
   */
  getVersionString(): string {
    const v = this.currentVersion;
    return `${v.major}.${v.minor}.${v.patch}`;
  }

  /**
   * Get full version history
   */
  getVersionHistory(): VersionInfo[] {
    return [...this.versionHistory];
  }

  /**
   * Check if this is the first time running this version
   */
  isNewVersion(): boolean {
    const storedVersion = localStorage.getItem('app_version');
    const currentVersion = this.getVersionString();
    
    if (storedVersion !== currentVersion) {
      localStorage.setItem('app_version', currentVersion);
      return true;
    }
    
    return false;
  }
}