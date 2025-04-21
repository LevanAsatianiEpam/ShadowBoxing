import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TimerService } from '../../services/timer.service';
import { SoundService } from '../../services/sound.service';
import { WorkoutIntensity } from '../../models/workout-history.model';

@Component({
  selector: 'app-timer-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './timer-settings.component.html',
  styleUrls: ['./timer-settings.component.css']
})
export class TimerSettingsComponent implements OnInit {
  // Timer settings
  totalRounds: number = 3;
  roundTime: number = 180; // 3 minutes in seconds
  restTime: number = 60; // 1 minute in seconds
  
  // Workout intensity
  workoutIntensity: WorkoutIntensity = WorkoutIntensity.Medium;
  // Define enum for template access
  intensities = WorkoutIntensity;
  
  // Music settings
  musicEnabled: boolean = false;
  musicSource: 'local' | 'youtube' = 'local';
  
  constructor(
    private timerService: TimerService,
    private soundService: SoundService
  ) {}
  
  ngOnInit(): void {
    // Load initial timer settings
    const settings = this.timerService.settings;
    this.totalRounds = settings.totalRounds;
    this.roundTime = settings.roundTime;
    this.restTime = settings.restTime;
    
    // Subscribe to music state changes
    this.soundService.musicState$.subscribe(state => {
      this.musicEnabled = state.enabled;
      this.musicSource = state.source;
    });
  }
  
  // Update timer settings when inputs change
  onSettingsChange(): void {
    this.timerService.updateSettings({
      totalRounds: this.totalRounds,
      roundTime: this.roundTime,
      restTime: this.restTime
    });
  }
  
  // Toggle music enabled/disabled
  onMusicEnabledChange(): void {
    this.soundService.toggleMusic(this.musicEnabled);
  }
  
  // Set music source to local
  setMusicSourceLocal(): void {
    this.musicSource = 'local';
    this.soundService.setMusicSource('local');
  }
  
  // Set music source to YouTube
  setMusicSourceYoutube(): void {
    this.musicSource = 'youtube';
    this.soundService.setMusicSource('youtube');
  }
  
  // Handle music file selection
  onMusicFileSelected(event: Event): void {
    this.soundService.handleMusicFileSelected(event);
  }
  
  // Update YouTube URL
  onYoutubeUrlChange(url: string): void {
    this.soundService.setMusicUrl(url);
  }
}