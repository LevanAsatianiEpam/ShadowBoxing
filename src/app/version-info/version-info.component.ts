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

  constructor(private versionService: VersionService) {}

  ngOnInit(): void {
    this.versionString = this.versionService.getVersionString();
    this.versionInfo = this.versionService.getCurrentVersion();
    this.versionHistory = this.versionService.getVersionHistory();
    
    // Show version dialog if this is the first time running this version
    if (this.versionService.isNewVersion()) {
      this.openDialog();
    }
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