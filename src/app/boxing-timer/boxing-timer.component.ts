import { Component, ElementRef, ViewChild, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { YoutubePlayerComponent } from '../youtube-player/youtube-player.component';
import { PresetManagerComponent } from '../preset-manager/preset-manager.component';
import { WorkoutHistoryComponent } from '../workout-history/workout-history.component';
import { UserProfileSettingsComponent } from '../user-profile-settings/user-profile-settings.component';
import { WorkoutPreset } from '../models/workout-preset.model';
import { WorkoutIntensity } from '../models/workout-history.model';
import { PresetService } from '../services/preset.service';
import { WorkoutHistoryService } from '../services/workout-history.service';

@Component({
  selector: 'app-boxing-timer',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule, 
    YoutubePlayerComponent, 
    PresetManagerComponent, 
    WorkoutHistoryComponent,
    UserProfileSettingsComponent
  ],
  templateUrl: './boxing-timer.component.html',
  styleUrl: './boxing-timer.component.css'
})
export class BoxingTimerComponent {
  // Audio references
  @ViewChild('bellSound') bellSound!: ElementRef<HTMLAudioElement>;
  @ViewChild('musicPlayer') musicPlayer!: ElementRef<HTMLAudioElement>;
  
  // Timer settings
  totalRounds: number = 3;
  roundTime: number = 180; // 3 minutes in seconds
  restTime: number = 60; // 1 minute in seconds
  
  // Timer state
  isRunning: boolean = false;
  isPaused: boolean = false;
  isResting: boolean = false;
  currentRound: number = 1;
  timeRemaining: number = 0;
  timerInterval: any;
  
  // Time tracking for accurate timing
  private lastTickTime: number = 0;
  
  // Workout tracking
  totalWorkoutTime: number = 0;
  workoutStartTime: number = 0;
  workoutIntensity: WorkoutIntensity = WorkoutIntensity.Medium;
  
  // Music settings
  musicEnabled: boolean = false;
  musicUrl: string = '';
  youtubeEnabled: boolean = false;
  youtubeUrl: string = '';
  youtubeIsPlaying: boolean = false;
  youtubePlayerReady: boolean = false;
  musicSource: 'local' | 'youtube' = 'local';
  
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
  
  constructor(
    private ngZone: NgZone, 
    private presetService: PresetService,
    public workoutHistoryService: WorkoutHistoryService
  ) {}

  // Start the boxing timer
  startTimer(): void {
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.isPaused = false;
    this.isResting = false;
    this.currentRound = 1;
    this.timeRemaining = this.roundTime;
    this.totalWorkoutTime = 0;
    this.workoutStartTime = Date.now();
    
    this.playBellSound();
    this.startRound();
  }
  
  // Start a new round
  startRound(): void {
    this.isResting = false;
    this.timeRemaining = this.roundTime;
    
    if (this.musicEnabled) {
      if (this.musicSource === 'youtube') {
        this.youtubeIsPlaying = true;
      } else if (this.musicPlayer?.nativeElement) {
        this.musicPlayer.nativeElement.play().catch(e => console.error('Error playing music:', e));
      }
    }
    
    this.startCountdown();
  }
  
  // Start rest period between rounds
  startRest(): void {
    // Check if this was the last round - if so, complete the workout
    if (this.currentRound >= this.totalRounds) {
      this.completeWorkout();
      return;
    }
    
    this.isResting = true;
    this.timeRemaining = this.restTime;
    
    this.playBellSound();
    
    // Pause music during rest if configured
    if (this.musicEnabled) {
      if (this.musicSource === 'youtube') {
        this.youtubeIsPlaying = false;
      } else if (this.musicPlayer?.nativeElement) {
        this.musicPlayer.nativeElement.pause();
      }
    }
    
    this.startCountdown();
  }
  
  // Complete the workout and save stats
  completeWorkout(): void {
    this.isRunning = false;
    clearInterval(this.timerInterval);
    
    // Stop music
    if (this.musicEnabled) {
      if (this.musicSource === 'youtube') {
        this.youtubeIsPlaying = false;
      } else if (this.musicPlayer?.nativeElement) {
        this.musicPlayer.nativeElement.pause();
        this.musicPlayer.nativeElement.currentTime = 0;
      }
    }
    
    // Calculate total duration in seconds
    const endTime = Date.now();
    const totalDurationMs = endTime - this.workoutStartTime;
    const totalDurationSeconds = Math.round(totalDurationMs / 1000);
    
    // Calculate calories burned
    const caloriesBurned = this.workoutHistoryService.calculateCaloriesBurned(
      totalDurationSeconds, 
      this.workoutIntensity
    );
    
    // Show completed modal with workout summary
    this.totalWorkoutTime = totalDurationSeconds;
    this.showWorkoutCompletedModal = true;
  }
  
  // Save the completed workout to history
  saveWorkoutToHistory(): void {
    const workoutData = {
      programName: this.currentPreset?.name || 'Custom Workout',
      programCategory: this.currentPreset?.category || 'Shadow Boxing',
      totalRounds: this.totalRounds,
      rounds: this.currentRound - 1,
      roundTime: this.roundTime,
      restTime: this.restTime,
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
  
  // Handle the countdown logic with background tab support
  startCountdown(): void {
    // Clear any existing timer
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
    
    // Set initial reference time
    this.lastTickTime = Date.now();
    
    // Run timer outside NgZone for better performance when tab is not in focus
    this.ngZone.runOutsideAngular(() => {
      this.timerInterval = setInterval(() => {
        // Only process timer if the workout is running and not paused
        if (this.isRunning && !this.isPaused) {
          const now = Date.now();
          const elapsedMs = now - this.lastTickTime;
          
          // Only update if enough time has passed (at least 1/4 second)
          if (elapsedMs >= 250) {
            // Calculate elapsed seconds (whole seconds)
            const elapsedSeconds = Math.floor(elapsedMs / 1000);
            
            // If at least 1 second has passed, update timer
            if (elapsedSeconds >= 1) {
              // Update our reference time, accounting for the seconds we're processing
              this.lastTickTime = now - (elapsedMs % 1000);
              
              // Use NgZone to update the UI
              this.ngZone.run(() => {
                // Decrement the time remaining by the exact elapsed seconds
                this.timeRemaining = Math.max(0, this.timeRemaining - elapsedSeconds);
                
                // Check if the countdown reached zero
                if (this.timeRemaining <= 0) {
                  // Play bell sound
                  this.playBellSound();
                  
                  if (this.isResting) {
                    // Rest period completed - move to next round
                    this.currentRound++;
                    
                    if (this.currentRound > this.totalRounds) {
                      // Workout completed
                      this.completeWorkout();
                    } else {
                      // Start next round
                      this.startRound();
                    }
                  } else {
                    // Round completed - start rest period
                    this.startRest();
                  }
                }
              });
            }
          }
        }
      }, 200); // Check frequently for better accuracy
    });
  }
  
  // Pause or resume timer
  pauseResumeTimer(): void {
    this.isPaused = !this.isPaused;
    
    // Pause/resume music
    if (this.musicEnabled) {
      if (this.musicSource === 'youtube') {
        this.youtubeIsPlaying = !this.isPaused;
      } else if (this.musicPlayer?.nativeElement) {
        if (this.isPaused) {
          this.musicPlayer.nativeElement.pause();
        } else {
          this.musicPlayer.nativeElement.play().catch(e => console.error('Error playing music:', e));
        }
      }
    }
  }
  
  // Reset timer to initial state
  resetTimer(): void {
    this.isRunning = false;
    this.isPaused = false;
    clearInterval(this.timerInterval);
    
    if (this.musicEnabled) {
      if (this.musicSource === 'youtube') {
        this.youtubeIsPlaying = false;
      } else if (this.musicPlayer?.nativeElement) {
        this.musicPlayer.nativeElement.pause();
        this.musicPlayer.nativeElement.currentTime = 0;
      }
    }
  }
  
  // Play bell sound
  playBellSound(): void {
    if (this.bellSound?.nativeElement) {
      this.bellSound.nativeElement.currentTime = 0;
      this.bellSound.nativeElement.play().catch(e => console.error('Error playing bell sound:', e));
    }
  }
  
  // Handle music file selection
  onMusicFileSelected(event: Event): void {
    const fileInput = event.target as HTMLInputElement;
    if (fileInput.files && fileInput.files.length > 0) {
      const file = fileInput.files[0];
      this.musicUrl = URL.createObjectURL(file);
    }
  }
  
  // Set music source to YouTube
  setMusicSourceYoutube(): void {
    this.musicSource = 'youtube';
  }
  
  // Set music source to local file
  setMusicSourceLocal(): void {
    this.musicSource = 'local';
  }
  
  // Handle YouTube player ready event
  onYoutubePlayerReady(): void {
    this.youtubePlayerReady = true;
  }
  
  // Format seconds to MM:SS display format
  formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }
  
  // Format seconds to HH:MM:SS display format (for longer durations)
  formatLongDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    let result = '';
    if (hours > 0) {
      result += `${hours}h `;
    }
    result += `${mins}m ${secs}s`;
    return result;
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
    this.totalRounds = preset.totalRounds;
    this.roundTime = preset.roundTime;
    this.restTime = preset.restTime;
    
    // Load music settings
    this.musicEnabled = preset.musicEnabled;
    this.musicSource = preset.musicSource;
    
    if (preset.musicUrl) {
      if (this.musicSource === 'youtube') {
        this.youtubeUrl = preset.musicUrl;
      } else {
        this.musicUrl = preset.musicUrl;
      }
    }
    
    this.currentPreset = preset;
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
    
    // Get the correct music URL based on source
    const savedMusicUrl = this.musicSource === 'youtube' ? this.youtubeUrl : this.musicUrl;
    
    if (this.currentPreset) {
      // Update existing preset
      this.presetService.updatePreset(this.currentPreset.id, {
        name: this.newPresetName,
        category: this.newPresetCategory,
        totalRounds: this.totalRounds,
        roundTime: this.roundTime,
        restTime: this.restTime,
        // Include music settings
        musicEnabled: this.musicEnabled,
        musicSource: this.musicSource,
        musicUrl: savedMusicUrl
      });
    } else {
      // Create new preset
      const newPreset = this.presetService.addPreset({
        name: this.newPresetName,
        category: this.newPresetCategory,
        totalRounds: this.totalRounds,
        roundTime: this.roundTime,
        restTime: this.restTime,
        // Include music settings
        musicEnabled: this.musicEnabled,
        musicSource: this.musicSource,
        musicUrl: savedMusicUrl,
        isFavorite: false
      });
      
      this.currentPreset = newPreset;
    }
    
    this.savePresetMode = false;
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
}
