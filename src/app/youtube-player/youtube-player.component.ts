import { Component, Input, Output, EventEmitter, OnDestroy, OnChanges, SimpleChanges, AfterViewInit, ElementRef, ViewChild, Renderer2 } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SafeResourceUrl, DomSanitizer } from '@angular/platform-browser';

@Component({
  selector: 'app-youtube-player',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './youtube-player.component.html',
  styleUrl: './youtube-player.component.css'
})
export class YoutubePlayerComponent implements OnChanges, OnDestroy, AfterViewInit {
  @Input() videoUrl: string = '';
  @Input() isPlaying: boolean = false;
  @Output() playerReady = new EventEmitter<void>();
  @Output() playerError = new EventEmitter<string>();
  
  @ViewChild('youtubeContainer') youtubeContainer: ElementRef;
  
  safeSrc: SafeResourceUrl | null = null;
  youtubeVideoId: string | null = null;
  isMobileDevice: boolean = false;
  useYouTubeAPI: boolean = true;
  player: any = null;
  isAPIReady: boolean = false;
  isPlayerReady: boolean = false;
  playerInitialized: boolean = false;
  private currentEmbedUrl: string = '';

  constructor(
    private sanitizer: DomSanitizer,
    private renderer: Renderer2
  ) {
    // Detect mobile devices
    this.isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    // Load YouTube API
    if (this.useYouTubeAPI && !window['YT']) {
      this.loadYouTubeAPI();
    } else if (window['YT'] && window['YT'].Player) {
      this.isAPIReady = true;
    }
  }

  ngAfterViewInit(): void {
    // Initialize player when API is ready and we have a video ID
    if (this.useYouTubeAPI && this.youtubeVideoId && this.isAPIReady) {
      this.initializeYouTubePlayer();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['videoUrl'] && this.videoUrl) {
      this.extractVideoId();
      
      if (this.youtubeVideoId) {
        if (this.useYouTubeAPI && this.isAPIReady) {
          if (this.player) {
            // Load new video in existing player
            this.player.loadVideoById(this.youtubeVideoId);
          } else {
            // Initialize new player
            this.initializeYouTubePlayer();
          }
        } else if (!this.useYouTubeAPI) {
          this.createSafeUrl();
        }
      }
    }
    
    // Handle play/pause changes
    if (changes['isPlaying'] && this.youtubeVideoId) {
      if (this.useYouTubeAPI && this.player && this.isPlayerReady) {
        if (this.isPlaying) {
          this.player.playVideo();
        } else {
          this.player.pauseVideo();
        }
      } else if (!this.useYouTubeAPI) {
        this.updatePlayerState();
      }
    }
  }

  ngOnDestroy(): void {
    // Clean up YouTube player if it exists
    if (this.player) {
      this.player.destroy();
      this.player = null;
    }
  }

  private loadYouTubeAPI(): void {
    // Add YouTube API script
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    const firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

    // Setup callback for when API is ready
    window['onYouTubeIframeAPIReady'] = () => {
      this.isAPIReady = true;
      if (this.youtubeVideoId) {
        this.initializeYouTubePlayer();
      }
    };
  }

  private initializeYouTubePlayer(): void {
    if (!this.youtubeContainer || this.playerInitialized) return;
    
    // Create container element for the player
    const container = this.youtubeContainer.nativeElement;
    const playerId = 'youtube-player-' + Math.random().toString(36).substr(2, 9);
    
    // Create div for YouTube player
    const playerElement = this.renderer.createElement('div');
    this.renderer.setAttribute(playerElement, 'id', playerId);
    this.renderer.appendChild(container, playerElement);
    
    try {
      // Initialize player
      this.playerInitialized = true;
      this.player = new window['YT'].Player(playerId, {
        videoId: this.youtubeVideoId,
        playerVars: {
          autoplay: this.isPlaying ? 1 : 0,
          controls: 1,
          playsinline: 1,
          modestbranding: 1,
          rel: 0,
          fs: 0,
          iv_load_policy: 3
        },
        events: {
          onReady: this.onPlayerReady.bind(this),
          onStateChange: this.onPlayerStateChange.bind(this),
          onError: this.onPlayerError.bind(this)
        }
      });
    } catch (e) {
      console.error('Error initializing YouTube player:', e);
      this.useYouTubeAPI = false;
      this.createSafeUrl(); // Fall back to iframe approach
      this.playerError.emit('Failed to initialize YouTube player API. Using fallback method.');
    }
  }

  private onPlayerReady(event: any): void {
    this.isPlayerReady = true;
    if (this.isPlaying) {
      event.target.playVideo();
    }
    this.playerReady.emit();
  }

  private onPlayerStateChange(event: any): void {
    // Handle player state changes if needed
  }

  private onPlayerError(event: any): void {
    console.error('YouTube player error:', event);
    // If API player fails, try falling back to iframe
    if (this.useYouTubeAPI) {
      this.useYouTubeAPI = false;
      this.createSafeUrl();
      this.playerError.emit('YouTube API player error. Using fallback method.');
    }
  }

  private extractVideoId(): void {
    // Extract video ID from various YouTube URL formats including mobile and playlist links
    let videoId = null;
    
    if (!this.videoUrl || typeof this.videoUrl !== 'string') {
      this.youtubeVideoId = null;
      return;
    }

    console.log('Processing YouTube URL:', this.videoUrl);
    
    try {
      // First clean the URL by removing any unnecessary whitespace
      const cleanUrl = this.videoUrl.trim();
      
      // Direct video ID pattern (11 characters consisting of alphanumeric, dash, and underscore)
      const directIdMatch = /^[A-Za-z0-9_-]{11}$/.exec(cleanUrl);
      if (directIdMatch) {
        videoId = cleanUrl;
        console.log('Matched direct video ID:', videoId);
      }
      // Handle all possible youtube.com URLs (including mobile m.youtube.com)
      else if (cleanUrl.includes('youtube.com') || cleanUrl.includes('youtu.be') || cleanUrl.includes('youtube.app')) {
        // Try to create a URL object to parse parameters easily
        // Add protocol if missing to prevent URL constructor errors
        let urlToProcess = cleanUrl;
        if (!urlToProcess.match(/^https?:\/\//)) {
          urlToProcess = 'https://' + urlToProcess;
        }
        
        console.log('Normalized URL to process:', urlToProcess);
        
        const url = new URL(urlToProcess);
        
        // Standard watch URL
        if (url.pathname.includes('/watch')) {
          videoId = url.searchParams.get('v');
          console.log('Watch URL param v=', videoId);
        } 
        // Embed URL
        else if (url.pathname.includes('/embed/')) {
          videoId = url.pathname.split('/embed/')[1]?.split('?')[0];
          console.log('Embed URL extracted ID:', videoId);
        }
        // Mobile app shorts
        else if (url.pathname.includes('/shorts/')) {
          videoId = url.pathname.split('/shorts/')[1]?.split('?')[0];
          console.log('Shorts URL extracted ID:', videoId);
        }
        // Mobile YouTube links
        else if (url.host.includes('m.youtube.com')) {
          if (url.pathname.includes('/watch')) {
            videoId = url.searchParams.get('v');
            console.log('Mobile watch URL param v=', videoId);
          }
        }
        // youtu.be shortened URLs
        else if (url.host.includes('youtu.be')) {
          videoId = url.pathname.substring(1).split('?')[0];
          console.log('youtu.be URL extracted ID:', videoId);
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
            console.log('Playlist URL param v=', videoId);
          }
        }
      }
    } catch (e) {
      console.error('Error parsing YouTube URL:', e);
      // URL constructor failed, fallback to regex
    }

    // If the URL constructor approach failed or didn't find a video ID, try regex patterns
    if (!videoId) {
      console.log('URL constructor failed to extract video ID, trying regex patterns');
      
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
          console.log('Regex pattern matched:', pattern, 'Video ID:', videoId);
          break;
        }
      }
    }
    
    this.youtubeVideoId = videoId;
    console.log('Final extracted video ID:', videoId);
  }

  private createSafeUrl(): void {
    if (this.youtubeVideoId) {
      // Build embed URL optimized for audio playback with mobile compatibility
      // Use YouTube's no-cookie domain for better privacy
      const embedUrl = `https://www.youtube-nocookie.com/embed/${this.youtubeVideoId}?` + 
        `enablejsapi=1` +
        `&playsinline=1` +
        `&rel=0` +
        `&modestbranding=1` +
        `&controls=1` +
        `&iv_load_policy=3` +
        `&origin=${encodeURIComponent(window.location.origin)}` +
        `${this.isPlaying ? '&autoplay=1&mute=0' : ''}`;
      
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
    // If we have a video ID, consider it valid even before the safe URL is created
    if (this.youtubeVideoId) {
      return true;
    }
    
    // If URL isn't provided yet, don't show an error
    if (!this.videoUrl || this.videoUrl.trim() === '') {
      return false;
    }
    
    // Check if URL contains common YouTube domain indicators
    const url = this.videoUrl.toLowerCase().trim();
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      // The URL looks like YouTube even if we couldn't extract the ID yet
      // This prevents error messages while user is still typing
      return true;
    }
    
    // Check if it might be a direct video ID (11 characters)
    if (/^[A-Za-z0-9_-]{11}$/.test(url)) {
      return true;
    }
    
    return false;
  }
}
