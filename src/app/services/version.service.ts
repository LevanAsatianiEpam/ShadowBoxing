import { Injectable } from '@angular/core';

// Try to import package.json, but provide a fallback in case of import issues
let packageVersion = '1.0.0';
try {
  // Using dynamic import for JSON to avoid TypeScript configuration issues
  const packageInfo = require('../../../package.json');
  if (packageInfo && packageInfo.version) {
    packageVersion = packageInfo.version;
  }
} catch (e) {
  console.warn('Could not load version from package.json:', e);
}

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
    try {
      // Parse version from package.json or use default
      const [major, minor, patch] = packageVersion.split('.').map(Number);

      this.currentVersion = {
        major: isNaN(major) ? 1 : major,
        minor: isNaN(minor) ? 0 : minor,
        patch: isNaN(patch) ? 0 : patch,
        releaseDate: new Date('2025-04-20'),
        changes: [
          'Add versioning support and fixed some bugs'
        ]
      };

      // Initialize version history
      this.versionHistory = [this.currentVersion];
    } catch (e) {
      console.error('Error initializing version service:', e);
      // Provide a fallback version if anything goes wrong
      this.currentVersion = {
        major: 1,
        minor: 0,
        patch: 0,
        releaseDate: new Date('2025-04-20'),
        changes: ['Initial release']
      };
      this.versionHistory = [this.currentVersion];
    }
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
    if (!v) {
      return '1.0.0'; // Fallback if currentVersion is undefined
    }
    return `${v.major || 0}.${v.minor || 0}.${v.patch || 0}`;
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