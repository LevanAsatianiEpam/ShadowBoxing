import { Component, ElementRef, ViewChild, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { take } from 'rxjs/operators';

// Components
import { YoutubePlayerComponent } from '../youtube-player/youtube-player.component';
import { PresetManagerComponent } from '../preset-manager/preset-manager.component';
import { WorkoutHistoryComponent } from '../workout-history/workout-history.component';
import { UserProfileSettingsComponent } from '../user-profile-settings/user-profile-settings.component';
import { TechniqueAnalysisComponent } from '../technique-analysis/technique-analysis.component';
import { TimerDisplayComponent } from './timer-display/timer-display.component';
import { TimerControlsComponent } from './timer-controls/timer-controls.component';
import { TimerSettingsComponent } from './timer-settings/timer-settings.component';

// Models
import { WorkoutPreset } from '../models/workout-preset.model';
import { WorkoutIntensity } from '../models/workout-history.model';

// Services
import { PresetService } from '../services/preset.service';
import { WorkoutHistoryService } from '../services/workout-history.service';
import { TimerService, TimerState } from '../services/timer.service';
import { SoundService, MusicState } from '../services/sound.service';

@Component({
  selector: 'app-boxing-timer',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule, 
    YoutubePlayerComponent, 
    PresetManagerComponent, 
    WorkoutHistoryComponent,
    UserProfileSettingsComponent,
    TechniqueAnalysisComponent,
    TimerDisplayComponent,
    TimerControlsComponent,
    TimerSettingsComponent
  ],
  templateUrl: './boxing-timer.component.html',
  styleUrls: ['./boxing-timer.component.css']
})
export class BoxingTimerComponent implements OnInit, OnDestroy {
  // Audio references
  @ViewChild('bellSound') bellSound!: ElementRef<HTMLAudioElement>;
  @ViewChild('musicPlayer') musicPlayer!: ElementRef<HTMLAudioElement>;
  
  // Timer state tracking
  isRunning: boolean = false;
  isCompleted: boolean = false;
  totalWorkoutTime: number = 0;
  workoutIntensity: WorkoutIntensity = WorkoutIntensity.Medium;
  
  // YouTube tracking
  youtubeUrl: string = '';
  youtubeIsPlaying: boolean = false;
  youtubePlayerReady: boolean = false;
  
  // Music settings
  musicEnabled: boolean = false;
  musicSource: 'local' | 'youtube' = 'local';
  musicUrl: string = '';
  
  // Preset Manager
  showPresetManager: boolean = false;
  currentPreset: WorkoutPreset | null = null;
  savePresetMode: boolean = false;
  newPresetName: string = '';
  newPresetCategory: string = 'Shadow Boxing';
  
  // Workout History
  showWorkoutHistory: boolean = false;
  showWorkoutCompletedModal: boolean = false;
  workoutNotes: string = '';
  
  // User Profile Settings
  showUserProfileSettings: boolean = false;
  
  // Technique Analysis
  showTechniqueAnalysisModal: boolean = false;
  
  // Subscriptions
  private timerSubscription: Subscription | null = null;
  private musicSubscription: Subscription | null = null;
  
  constructor(
    public timerService: TimerService,
    public soundService: SoundService,
    private presetService: PresetService,
    public workoutHistoryService: WorkoutHistoryService
  ) {}
  
  ngOnInit(): void {
    // Subscribe to timer status changes
    this.timerSubscription = this.timerService.status$.subscribe(status => {
      // When timer state changes, update local state
      const wasRunningBefore = this.isRunning;
      this.isRunning = status.isRunning;
      this.isCompleted = status.state === TimerState.Complete;
      
      // Start music when timer starts
      if (!wasRunningBefore && this.isRunning) {
        this.handleTimerStart();
      } else if (wasRunningBefore && !this.isRunning) {
        // Timer has stopped
        this.handleTimerStop();
      }
      
      // Handle workout completion
      if (status.state === TimerState.Complete && status.totalElapsedTime > 0) {
        this.totalWorkoutTime = status.totalElapsedTime;
        this.showWorkoutCompletedModal = true;
      }
    });
    
    // Subscribe to music state changes
    this.musicSubscription = this.soundService.musicState$.subscribe(state => {
      this.musicEnabled = state.enabled;
      this.musicSource = state.source;
      this.youtubeUrl = state.source === 'youtube' ? state.url : '';
      this.musicUrl = state.url;
      this.youtubeIsPlaying = state.source === 'youtube' && state.isPlaying;
    });
  }
  
  ngOnDestroy(): void {
    // Clean up subscriptions
    if (this.timerSubscription) {
      this.timerSubscription.unsubscribe();
    }
    
    if (this.musicSubscription) {
      this.musicSubscription.unsubscribe();
    }
    
    // Stop any playing music
    this.soundService.stopMusic();
  }
  
  ngAfterViewInit(): void {
    // Set audio element references in SoundService
    if (this.bellSound?.nativeElement) {
      this.soundService.setBellSoundElement(this.bellSound.nativeElement);
    }
    
    if (this.musicPlayer?.nativeElement) {
      this.soundService.setMusicPlayerElement(this.musicPlayer.nativeElement);
    }
  }
  
  // Handle starting the timer
  private handleTimerStart(): void {
    // Play music if enabled
    if (this.musicEnabled && this.musicUrl) {
      console.log('Starting timer, playing music');
      this.soundService.playMusic();
      
      // Force the isPlaying flag to update for YouTube
      if (this.musicSource === 'youtube') {
        this.youtubeIsPlaying = true;
      }
    }
  }
  
  // Handle stopping the timer
  private handleTimerStop(): void {
    // Stop music when timer stops
    if (this.musicEnabled) {
      console.log('Stopping timer, pausing music');
      this.soundService.pauseMusic();
      
      // Force the isPlaying flag to update for YouTube
      if (this.musicSource === 'youtube') {
        this.youtubeIsPlaying = false;
      }
    }
  }
  
  // Format seconds to HH:MM:SS display format (for longer durations)
  formatLongDuration(seconds: number): string {
    return this.timerService.formatLongDuration(seconds);
  }
  
  // Complete the workout and save stats
  saveWorkoutToHistory(): void {
    const workoutData = {
      programName: this.currentPreset?.name || 'Custom Workout',
      programCategory: this.currentPreset?.category || 'Shadow Boxing',
      totalRounds: this.timerService.settings.totalRounds,
      rounds: this.timerService.settings.totalRounds, // Assuming all rounds were completed
      roundTime: this.timerService.settings.roundTime,
      restTime: this.timerService.settings.restTime,
      duration: this.totalWorkoutTime,
      caloriesBurned: this.workoutHistoryService.calculateCaloriesBurned(
        this.totalWorkoutTime, 
        this.workoutIntensity
      ),
      intensity: this.workoutIntensity,
      notes: this.workoutNotes
    };
    
    this.workoutHistoryService.addWorkout(workoutData);
    this.closeWorkoutCompletedModal();
  }
  
  closeWorkoutCompletedModal(): void {
    this.showWorkoutCompletedModal = false;
    this.workoutNotes = '';
  }
  
  // Handle YouTube player ready event
  onYoutubePlayerReady(): void {
    console.log('YouTube player ready event received');
    this.youtubePlayerReady = true;
    
    // If timer is already running and music is enabled, start playing
    if (this.isRunning && this.musicEnabled && this.musicSource === 'youtube') {
      console.log('Auto-playing YouTube because timer is already running');
      this.youtubeIsPlaying = true;
      this.soundService.playMusic();
    }
  }
  
  // Preset Management
  showPresets(): void {
    this.showPresetManager = true;
  }
  
  hidePresets(): void {
    this.showPresetManager = false;
  }
  
  onPresetSelected(preset: WorkoutPreset): void {
    // Load timer settings
    this.timerService.updateSettings({
      totalRounds: preset.totalRounds,
      roundTime: preset.roundTime,
      restTime: preset.restTime
    });
    
    // Load music settings
    this.soundService.toggleMusic(preset.musicEnabled);
    this.soundService.setMusicSource(preset.musicSource);
    
    if (preset.musicUrl) {
      this.soundService.setMusicUrl(preset.musicUrl);
      
      if (preset.musicSource === 'youtube') {
        this.youtubeUrl = preset.musicUrl;
      }
    }
    
    this.currentPreset = preset;
    this.hidePresets();
  }
  
  showSavePresetForm(): void {
    this.savePresetMode = true;
    this.newPresetName = this.currentPreset?.name || '';
    this.newPresetCategory = this.currentPreset?.category || 'Shadow Boxing';
  }
  
  cancelSavePreset(): void {
    this.savePresetMode = false;
  }
  
  saveCurrentSettings(): void {
    if (!this.newPresetName.trim()) {
      alert('Please enter a name for your preset');
      return;
    }
    
    // Get current settings
    const settings = this.timerService.settings;
    let currentMusicState: MusicState;
    
    // Get current music state as a snapshot
    this.soundService.musicState$.pipe(take(1)).subscribe(state => {
      currentMusicState = state;
      
      if (this.currentPreset) {
        // Update existing preset
        this.presetService.updatePreset(this.currentPreset.id, {
          name: this.newPresetName,
          category: this.newPresetCategory,
          totalRounds: settings.totalRounds,
          roundTime: settings.roundTime,
          restTime: settings.restTime,
          // Include music settings
          musicEnabled: currentMusicState.enabled,
          musicSource: currentMusicState.source,
          musicUrl: currentMusicState.url
        });
      } else {
        // Create new preset
        const newPreset = this.presetService.addPreset({
          name: this.newPresetName,
          category: this.newPresetCategory,
          totalRounds: settings.totalRounds,
          roundTime: settings.roundTime,
          restTime: settings.restTime,
          // Include music settings
          musicEnabled: currentMusicState.enabled,
          musicSource: currentMusicState.source,
          musicUrl: currentMusicState.url,
          isFavorite: false
        });
        
        this.currentPreset = newPreset;
      }
      
      this.savePresetMode = false;
    });
  }
  
  // Workout History
  showHistory(): void {
    this.showWorkoutHistory = true;
  }
  
  hideHistory(): void {
    this.showWorkoutHistory = false;
  }
  
  // User Profile Settings
  showProfile(): void {
    this.showUserProfileSettings = true;
  }
  
  hideProfile(): void {
    this.showUserProfileSettings = false;
  }
  
  // Technique Analysis
  showTechniqueAnalysis(): void {
    this.showTechniqueAnalysisModal = true;
  }
  
  hideTechniqueAnalysis(): void {
    this.showTechniqueAnalysisModal = false;
  }
}
