import { Component, Input, Output, EventEmitter, OnDestroy, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SafeResourceUrl, DomSanitizer } from '@angular/platform-browser';

@Component({
  selector: 'app-youtube-player',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './youtube-player.component.html',
  styleUrl: './youtube-player.component.css'
})
export class YoutubePlayerComponent implements OnChanges, OnDestroy {
  @Input() videoUrl: string = '';
  @Input() isPlaying: boolean = false;
  @Output() playerReady = new EventEmitter<void>();

  safeSrc: SafeResourceUrl | null = null;
  youtubeVideoId: string | null = null;
  private currentEmbedUrl: string = '';

  constructor(private sanitizer: DomSanitizer) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['videoUrl'] && this.videoUrl) {
      this.extractVideoId();
      if (this.youtubeVideoId) {
        this.createSafeUrl();
      }
    }
    
    // Handle play/pause changes
    if (changes['isPlaying'] && this.youtubeVideoId) {
      this.updatePlayerState();
    }
  }

  ngOnDestroy(): void {
    // Clean up resources if needed
  }

  private extractVideoId(): void {
    // Extract video ID from various YouTube URL formats
    const urlPatterns = [
      /(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?v=([^&]+)/,
      /(?:https?:\/\/)?(?:www\.)?youtu\.be\/([^?]+)/,
      /(?:https?:\/\/)?(?:www\.)?youtube\.com\/embed\/([^?]+)/
    ];

    for (const pattern of urlPatterns) {
      const match = this.videoUrl.match(pattern);
      if (match && match[1]) {
        this.youtubeVideoId = match[1];
        return;
      }
    }

    this.youtubeVideoId = null;
  }

  private createSafeUrl(): void {
    if (this.youtubeVideoId) {
      // Create an embed URL with autoplay parameters and mute (mute is required for autoplay in most browsers)
      this.currentEmbedUrl = `https://www.youtube.com/embed/${this.youtubeVideoId}?enablejsapi=1&controls=1&autoplay=${this.isPlaying ? '1' : '0'}&mute=0&playsinline=1&rel=0`;
      this.safeSrc = this.sanitizer.bypassSecurityTrustResourceUrl(this.currentEmbedUrl);
      
      // Notify parent component that player is ready
      setTimeout(() => this.playerReady.emit(), 1000);
    }
  }

  private updatePlayerState(): void {
    if (this.youtubeVideoId) {
      // Update the embed URL with the new autoplay state
      this.currentEmbedUrl = `https://www.youtube.com/embed/${this.youtubeVideoId}?enablejsapi=1&controls=1&autoplay=${this.isPlaying ? '1' : '0'}&mute=0&playsinline=1&rel=0`;
      this.safeSrc = this.sanitizer.bypassSecurityTrustResourceUrl(this.currentEmbedUrl);
    }
  }

  isValidUrl(): boolean {
    return !!this.youtubeVideoId && !!this.safeSrc;
  }
}
