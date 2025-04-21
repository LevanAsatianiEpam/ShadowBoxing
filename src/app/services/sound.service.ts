import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface MusicState {
  enabled: boolean;
  source: 'local' | 'youtube';
  url: string;
  isPlaying: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class SoundService {
  private bellSoundElement: HTMLAudioElement | null = null;
  private musicPlayerElement: HTMLAudioElement | null = null;
  
  private _musicState = new BehaviorSubject<MusicState>({
    enabled: false,
    source: 'local',
    url: '',
    isPlaying: false
  });
  
  constructor() {
    // Pre-load bell sound
    this.initBellSound();
  }
  
  get musicState$(): Observable<MusicState> {
    return this._musicState.asObservable();
  }
  
  // Initialize bell sound element
  private initBellSound(): void {
    if (typeof window !== 'undefined') {
      this.bellSoundElement = new Audio('assets/bell.mp3');
      this.bellSoundElement.preload = 'auto';
      this.bellSoundElement.load();
    }
  }
  
  // Set bell sound element reference
  setBellSoundElement(element: HTMLAudioElement): void {
    this.bellSoundElement = element;
  }
  
  // Set music player element reference
  setMusicPlayerElement(element: HTMLAudioElement): void {
    this.musicPlayerElement = element;
  }
  
  // Play the bell sound
  playBellSound(): void {
    if (this.bellSoundElement) {
      this.bellSoundElement.currentTime = 0;
      this.bellSoundElement.play().catch(e => console.error('Error playing bell sound:', e));
    }
  }
  
  // Toggle music on/off
  toggleMusic(enabled: boolean): void {
    const currentState = this._musicState.value;
    this._musicState.next({
      ...currentState,
      enabled
    });
    
    if (!enabled && currentState.isPlaying) {
      this.stopMusic();
    }
  }
  
  // Set music source
  setMusicSource(source: 'local' | 'youtube'): void {
    const currentState = this._musicState.value;
    // If changing sources, stop current playback
    if (currentState.source !== source && currentState.isPlaying) {
      this.stopMusic();
    }
    
    this._musicState.next({
      ...currentState,
      source
    });
  }
  
  // Set music URL
  setMusicUrl(url: string): void {
    const currentState = this._musicState.value;
    // If URL changes, stop current playback
    if (currentState.url !== url && currentState.isPlaying) {
      this.stopMusic();
    }
    
    this._musicState.next({
      ...currentState,
      url
    });
  }
  
  // Play music
  playMusic(): void {
    const state = this._musicState.value;
    
    if (!state.enabled || !state.url) return;
    
    if (state.source === 'local' && this.musicPlayerElement) {
      this.musicPlayerElement.play().catch(e => console.error('Error playing music:', e));
    }
    
    this._musicState.next({
      ...state,
      isPlaying: true
    });
    
    console.log('Sound service: Playing music', state.source, state.url);
  }
  
  // Pause music
  pauseMusic(): void {
    const state = this._musicState.value;
    
    if (!state.enabled || !state.isPlaying) return;
    
    if (state.source === 'local' && this.musicPlayerElement) {
      this.musicPlayerElement.pause();
    }
    
    this._musicState.next({
      ...state,
      isPlaying: false
    });
    
    console.log('Sound service: Pausing music');
  }
  
  // Stop music
  stopMusic(): void {
    const state = this._musicState.value;
    
    if (state.source === 'local' && this.musicPlayerElement) {
      this.musicPlayerElement.pause();
      this.musicPlayerElement.currentTime = 0;
    }
    
    this._musicState.next({
      ...state,
      isPlaying: false
    });
    
    console.log('Sound service: Stopping music');
  }
  
  // Handle music file selection
  handleMusicFileSelected(event: Event): void {
    const fileInput = event.target as HTMLInputElement;
    if (fileInput.files && fileInput.files.length > 0) {
      const file = fileInput.files[0];
      const url = URL.createObjectURL(file);
      
      this.setMusicUrl(url);
    }
  }
}