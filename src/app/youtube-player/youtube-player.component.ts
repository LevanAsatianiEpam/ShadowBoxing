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
    
    if (!this.videoUrl || typeof this.videoUrl !== 'string') {
      this.youtubeVideoId = null;
      return;
    }

    try {
      // First clean the URL by removing any unnecessary whitespace
      const cleanUrl = this.videoUrl.trim();
      
      // Handle all possible youtube.com URLs (including mobile m.youtube.com)
      if (cleanUrl.includes('youtube.com') || cleanUrl.includes('youtu.be') || cleanUrl.includes('youtube.app')) {
        // Try to create a URL object to parse parameters easily
        // Add protocol if missing to prevent URL constructor errors
        let urlToProcess = cleanUrl;
        if (!urlToProcess.match(/^https?:\/\//)) {
          urlToProcess = 'https://' + urlToProcess;
        }
        
        const url = new URL(urlToProcess);
        
        // Standard watch URL
        if (url.pathname.includes('/watch')) {
          videoId = url.searchParams.get('v');
        } 
        // Embed URL
        else if (url.pathname.includes('/embed/')) {
          videoId = url.pathname.split('/embed/')[1]?.split('?')[0];
        }
        // Mobile app shorts
        else if (url.pathname.includes('/shorts/')) {
          videoId = url.pathname.split('/shorts/')[1]?.split('?')[0];
        }
        // Mobile YouTube links
        else if (url.host.includes('m.youtube.com')) {
          if (url.pathname.includes('/watch')) {
            videoId = url.searchParams.get('v');
          }
        }
        // youtu.be shortened URLs
        else if (url.host.includes('youtu.be')) {
          videoId = url.pathname.substring(1).split('?')[0];
        }
        // YouTube mobile app deep links
        else if (url.host.includes('youtube.app')) {
          // These can be complex, so we'll rely on regex pattern matching below
        }
        
        // Remove any hash fragments
        if (videoId && videoId.includes('#')) {
          videoId = videoId.split('#')[0];
        }
        
        // Handle playlists - we still get the first video's ID
        if (!videoId && url.searchParams.get('list')) {
          const videoParam = url.searchParams.get('v');
          if (videoParam) {
            videoId = videoParam;
          }
        }
      }
    } catch (e) {
      console.error('Error parsing YouTube URL:', e);
      // URL constructor failed, fallback to regex
    }

    // If the URL constructor approach failed or didn't find a video ID, try regex patterns
    if (!videoId) {
      const urlPatterns = [
        /(?:https?:\/\/)?(?:www\.|m\.)?youtube\.com\/watch\?v=([^&#]+)/i,
        /(?:https?:\/\/)?(?:www\.)?youtu\.be\/([^?#]+)/i,
        /(?:https?:\/\/)?(?:www\.|m\.)?youtube\.com\/embed\/([^?#]+)/i,
        /(?:https?:\/\/)?(?:www\.|m\.)?youtube\.com\/shorts\/([^?#]+)/i,
        /(?:https?:\/\/)?youtube\.app\.goo\.gl\/([^?#]+)/i,
        /(?:https?:\/\/)?youtu\.be\/([^?#]+)/i,
        /(?:https?:\/\/)?youtube:\/\/([^?#]+)/i, // YouTube app deep links
        /v=([^&#]+)/i, // Simplified pattern to match v parameter
        /\/v\/([^?#]+)/i, // Another variation
        /vi\/([^?#]+)/i, // Another variation
        /\/embed\/([^?#]+)/i, // Another variation
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
      // Build embed URL optimized for audio playback
      const embedUrl = `https://www.youtube.com/embed/${this.youtubeVideoId}?` + 
        `enablejsapi=1` +
        `&playsinline=1` +
        `&rel=0` +
        `&modestbranding=1` +
        `&controls=1` +
        `&iv_load_policy=3` + // Hide annotations
        `&disablekb=0` + 
        `&fs=0` + // Disable fullscreen
        `&origin=${encodeURIComponent(window.location.origin)}` +
        `${this.isPlaying ? '&autoplay=1' : ''}`;
      
      // Add playlist if present in original URL
      let finalEmbedUrl = embedUrl;
      try {
        // Handle playlists
        if (this.videoUrl.includes('list=')) {
          const match = this.videoUrl.match(/[?&]list=([^&]+)/);
          if (match && match[1]) {
            finalEmbedUrl += `&list=${match[1]}`;
          }
        }
      } catch (e) {
        console.warn('Error extracting playlist information:', e);
      }
      
      this.currentEmbedUrl = finalEmbedUrl;
      this.safeSrc = this.sanitizer.bypassSecurityTrustResourceUrl(finalEmbedUrl);
      
      // Notify parent component that player is ready
      setTimeout(() => this.playerReady.emit(), 1000);
    }
  }

  private updatePlayerState(): void {
    if (this.youtubeVideoId) {
      this.createSafeUrl();
    }
  }

  isValidUrl(): boolean {
    return !!this.youtubeVideoId && !!this.safeSrc;
  }
}
