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
    // Extract video ID from various YouTube URL formats including mobile and playlist links
    let videoId = null;
    
    try {
      // Handle full youtube.com URLs
      if (this.videoUrl.includes('youtube.com')) {
        // Create a URL object to parse parameters easily
        const url = new URL(this.videoUrl);
        
        // Standard watch URL
        if (url.pathname.includes('/watch')) {
          videoId = url.searchParams.get('v');
        } 
        // Embed URL
        else if (url.pathname.includes('/embed/')) {
          videoId = url.pathname.split('/embed/')[1];
        }
        // Shortened URL
        else if (url.pathname.includes('/shorts/')) {
          videoId = url.pathname.split('/shorts/')[1];
        }
        
        // Handle playlists - we still get the first video's ID
        if (!videoId && url.searchParams.get('list')) {
          const videoParam = url.searchParams.get('v');
          if (videoParam) {
            videoId = videoParam;
          }
        }
      } 
      // Handle youtu.be shortened URLs
      else if (this.videoUrl.includes('youtu.be')) {
        const url = new URL(this.videoUrl);
        videoId = url.pathname.substring(1);
      }
      // Handle mobile links (m.youtube.com)
      else if (this.videoUrl.includes('m.youtube.com')) {
        const url = new URL(this.videoUrl);
        if (url.pathname.includes('/watch')) {
          videoId = url.searchParams.get('v');
        }
      }
    } catch (e) {
      console.error('Error parsing YouTube URL:', e);
      // Fall back to regex pattern matching if URL parsing fails
      const urlPatterns = [
        /(?:https?:\/\/)?(?:www\.|m\.)?youtube\.com\/watch\?v=([^&]+)/,
        /(?:https?:\/\/)?(?:www\.)?youtu\.be\/([^?]+)/,
        /(?:https?:\/\/)?(?:www\.)?youtube\.com\/embed\/([^?]+)/,
        /(?:https?:\/\/)?(?:www\.)?youtube\.com\/shorts\/([^?]+)/
      ];

      for (const pattern of urlPatterns) {
        const match = this.videoUrl.match(pattern);
        if (match && match[1]) {
          videoId = match[1];
          break;
        }
      }
    }
    
    this.youtubeVideoId = videoId;
  }

  private createSafeUrl(): void {
    if (this.youtubeVideoId) {
      // Build the embed URL with appropriate parameters
      let embedUrl = `https://www.youtube.com/embed/${this.youtubeVideoId}?enablejsapi=1&controls=1&autoplay=${this.isPlaying ? '1' : '0'}&mute=0&playsinline=1&rel=0`;
      
      // If the original URL has a playlist parameter, add it to the embed URL
      try {
        const originalUrl = new URL(this.videoUrl);
        const playlist = originalUrl.searchParams.get('list');
        if (playlist) {
          embedUrl += `&list=${playlist}`;
        }
      } catch (e) {
        console.warn('Error extracting playlist information:', e);
      }
      
      this.currentEmbedUrl = embedUrl;
      this.safeSrc = this.sanitizer.bypassSecurityTrustResourceUrl(embedUrl);
      
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
