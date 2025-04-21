import { Component, Input, Output, EventEmitter, OnDestroy, OnChanges, SimpleChanges, AfterViewInit, ElementRef, ViewChild, Renderer2, inject } from '@angular/core';
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
  
  private sanitizer = inject(DomSanitizer);
  private renderer = inject(Renderer2);
  
  safeSrc: SafeResourceUrl | null = null;
  youtubeVideoId: string | null = null;
  playlistId: string | null = null;
  isPlaylist: boolean = false;
  videoTitle: string = '';
  playlistTitle: string = '';
  isMobileDevice: boolean = false;
  useYouTubeAPI: boolean = true;
  player: any = null;
  isAPIReady: boolean = false;
  isPlayerReady: boolean = false;
  playerInitialized: boolean = false;
  private currentEmbedUrl: string = '';

  constructor() {
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
            if (this.isPlaylist && this.playlistId) {
              this.player.loadPlaylist({
                listType: 'playlist',
                list: this.playlistId,
                index: 0,
                startSeconds: 0
              });
            } else {
              this.player.loadVideoById(this.youtubeVideoId);
            }
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
      // Prepare player options
      const playerVars: any = {
        autoplay: this.isPlaying ? 1 : 0,
        controls: 1, // Always show controls
        playsinline: 1,
        modestbranding: 1,
        rel: 0,
        fs: 1, // Allow fullscreen
        iv_load_policy: 3
      };
      
      // Add playlist if available
      if (this.isPlaylist && this.playlistId) {
        playerVars.list = this.playlistId;
        playerVars.listType = 'playlist';
      }
      
      // Initialize player
      this.playerInitialized = true;
      this.player = new window['YT'].Player(playerId, {
        videoId: this.youtubeVideoId,
        playerVars: playerVars,
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
    
    // Start playing if needed
    if (this.isPlaying) {
      event.target.playVideo();
    }
    
    // Get video title if available
    try {
      const videoData = event.target.getVideoData();
      if (videoData && videoData.title) {
        this.videoTitle = videoData.title;
      }
      
      // Check if we're viewing a playlist
      const playlistId = event.target.getPlaylist();
      if (playlistId && playlistId.length > 0) {
        this.isPlaylist = true;
      }
    } catch (e) {
      console.warn('Could not get video data:', e);
    }
    
    this.playerReady.emit();
  }

  private onPlayerStateChange(event: any): void {
    // Update play state and video information when state changes
    switch(event.data) {
      case window['YT'].PlayerState.PLAYING:
        // Try to get video title when video starts playing
        try {
          const videoData = event.target.getVideoData();
          if (videoData && videoData.title) {
            this.videoTitle = videoData.title;
          }
          
          // Check if current video is part of a playlist
          const playlistId = event.target.getPlaylist();
          if (playlistId && playlistId.length > 0) {
            this.isPlaylist = true;
            // Get current position in playlist
            const index = event.target.getPlaylistIndex();
            if (index !== undefined) {
              this.playlistTitle = `Video ${index + 1} of ${playlistId.length}`;
            }
          }
        } catch (e) {
          console.warn('Error getting video data on state change:', e);
        }
        break;
        
      case window['YT'].PlayerState.CUED:
        // Video is cued and ready to play
        break;
    }
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
    // Extract video ID and playlist ID from various YouTube URL formats
    let videoId = null;
    let playlistId = null;
    
    if (!this.videoUrl || typeof this.videoUrl !== 'string') {
      this.youtubeVideoId = null;
      this.playlistId = null;
      this.isPlaylist = false;
      return;
    }

    console.log('Processing YouTube URL:', this.videoUrl);
    
    try {
      // First clean the URL by removing any unnecessary whitespace
      const cleanUrl = this.videoUrl.trim();
      
      // Check for playlist ID in the URL
      const playlistMatch = cleanUrl.match(/[?&]list=([^&#]+)/i);
      if (playlistMatch && playlistMatch[1]) {
        playlistId = playlistMatch[1];
        this.isPlaylist = true;
        console.log('Found playlist ID:', playlistId);
      }
      
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
        
        // Check for playlist without a video
        if (url.pathname.includes('/playlist')) {
          // This is a pure playlist link, we may not have a video ID yet
          this.isPlaylist = true;
          if (!videoId) {
            // Use the first video of the playlist
            videoId = null; // YouTube API will load the first video automatically
          }
        }
        // Standard watch URL
        else if (url.pathname.includes('/watch')) {
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
    
    // Store the extracted IDs
    this.youtubeVideoId = videoId;
    this.playlistId = playlistId;
    
    // For pure playlist URLs without a video ID
    if (this.isPlaylist && this.playlistId && !this.youtubeVideoId) {
      // We'll let YouTube API handle this by loading the first video
      this.youtubeVideoId = 'placeholder';
    }
    
    console.log('Final extracted video ID:', videoId);
    console.log('Playlist ID:', playlistId);
    console.log('Is Playlist:', this.isPlaylist);
  }

  private createSafeUrl(): void {
    if (this.youtubeVideoId || (this.isPlaylist && this.playlistId)) {
      // Build embed URL with appropriate options
      let embedUrl = 'https://www.youtube-nocookie.com/embed/';
      
      // Add video ID if available, otherwise just use the playlist
      if (this.youtubeVideoId && this.youtubeVideoId !== 'placeholder') {
        embedUrl += `${this.youtubeVideoId}?`;
      } else {
        embedUrl += `?`;
      }
      
      // Add common parameters - always showing controls
      embedUrl += `enablejsapi=1` +
        `&playsinline=1` +
        `&rel=0` +
        `&modestbranding=1` +
        `&controls=1` +
        `&iv_load_policy=3` +
        `&origin=${encodeURIComponent(window.location.origin)}` +
        `${this.isPlaying ? '&autoplay=1&mute=0' : ''}`;
      
      // Add playlist if present
      let finalEmbedUrl = embedUrl;
      if (this.isPlaylist && this.playlistId) {
        finalEmbedUrl += `&list=${this.playlistId}`;
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
    // Valid if we have a video ID or a playlist ID
    if (this.youtubeVideoId || (this.isPlaylist && this.playlistId)) {
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
