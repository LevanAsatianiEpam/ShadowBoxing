import { Injectable } from '@angular/core';

// Create a type-safe interface for our package.json structure
interface PackageInfo {
  version: string;
  name?: string;
  [key: string]: any;
}

// Default version if package.json can't be loaded
const DEFAULT_VERSION = '1.0.0';

// Static version info - this is updated by CI/CD pipeline
// Using hardcoded version information to avoid package.json import issues
const CURRENT_VERSION = {
  major: 1,
  minor: 1, 
  patch: 0,
  releaseDate: new Date('2025-04-20'),
  changes: [
    'Added YouTube music player',
    'Bug fixes and improvements'
  ]
};

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
    // Use the static version info
    this.currentVersion = CURRENT_VERSION;

    // Set up version history (newest first)
    this.versionHistory = [
      this.currentVersion,
      // Previous version history
      {
        major: 1,
        minor: 0,
        patch: 0,
        releaseDate: new Date('2025-03-15'),
        changes: ['Initial release']
      }
    ];
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
    try {
      const storedVersion = localStorage.getItem('app_version');
      const currentVersion = this.getVersionString();
      
      if (storedVersion !== currentVersion) {
        localStorage.setItem('app_version', currentVersion);
        return true;
      }
      
      return false;
    } catch (e) {
      console.error('Error checking for new version:', e);
      return false;
    }
  }
}