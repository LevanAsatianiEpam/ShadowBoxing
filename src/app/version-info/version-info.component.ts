import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { VersionInfo, VersionService } from '../services/version.service';

@Component({
  selector: 'app-version-info',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './version-info.component.html',
  styleUrl: './version-info.component.css'
})
export class VersionInfoComponent implements OnInit {
  versionString: string = '';
  versionInfo: VersionInfo | null = null;
  isDialogOpen: boolean = false;
  versionHistory: VersionInfo[] = [];
  isNewVersion: boolean = false;

  constructor(private versionService: VersionService) {}

  ngOnInit(): void {
    this.versionString = this.versionService.getVersionString();
    this.versionInfo = this.versionService.getCurrentVersion();
    this.versionHistory = this.versionService.getVersionHistory();
    
    // Check if this is a new version but don't open dialog automatically
    this.isNewVersion = this.versionService.isNewVersion();
    
    // Store current version in localStorage to prevent future popups
    localStorage.setItem('app_version', this.versionString);
  }

  openDialog(): void {
    this.isDialogOpen = true;
  }

  closeDialog(): void {
    this.isDialogOpen = false;
  }

  formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }
}