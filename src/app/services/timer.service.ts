import { Injectable, NgZone } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { SoundService } from './sound.service';

export enum TimerState {
  Idle,
  GettingReady,
  Round,
  Rest,
  Complete
}

export interface TimerSettings {
  totalRounds: number;
  roundTime: number; // in seconds
  restTime: number; // in seconds
  getReadyTime: number; // in seconds
}

export interface TimerStatus {
  state: TimerState;
  currentRound: number;
  timeRemaining: number;
  isRunning: boolean;
  isPaused: boolean;
  totalElapsedTime: number;
}

@Injectable({
  providedIn: 'root'
})
export class TimerService {
  private timerInterval: any;
  private lastTickTime: number = 0;
  private tenSecondWarningSounded: boolean = false;
  private workoutStartTime: number = 0;
  
  // Default timer settings
  private _settings: TimerSettings = {
    totalRounds: 3,
    roundTime: 180, // 3 minutes
    restTime: 60, // 1 minute
    getReadyTime: 10 // 10 seconds
  };
  
  // Timer status
  private _status = new BehaviorSubject<TimerStatus>({
    state: TimerState.Idle,
    currentRound: 1,
    timeRemaining: 0,
    isRunning: false,
    isPaused: false,
    totalElapsedTime: 0
  });

  constructor(
    private ngZone: NgZone,
    private soundService: SoundService
  ) {}
  
  // Get current timer status as observable
  get status$(): Observable<TimerStatus> {
    return this._status.asObservable();
  }
  
  // Get current timer settings
  get settings(): TimerSettings {
    return { ...this._settings };
  }
  
  // Update timer settings
  updateSettings(newSettings: Partial<TimerSettings>): void {
    this._settings = { ...this._settings, ...newSettings };
  }
  
  // Start the timer
  start(): void {
    const currentStatus = this._status.value;
    
    // Don't restart if already running
    if (currentStatus.isRunning && !currentStatus.isPaused) return;
    
    this._status.next({
      state: TimerState.GettingReady,
      currentRound: 1,
      timeRemaining: this._settings.getReadyTime,
      isRunning: true,
      isPaused: false,
      totalElapsedTime: 0
    });
    
    this.workoutStartTime = Date.now();
    this.soundService.playBellSound();
    this.startCountdown();
  }
  
  // Pause or resume timer
  togglePause(): void {
    const currentStatus = this._status.value;
    
    // Can only pause/resume if running
    if (!currentStatus.isRunning) return;
    
    this._status.next({
      ...currentStatus,
      isPaused: !currentStatus.isPaused
    });
  }
  
  // Reset timer to initial state
  reset(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
    
    this._status.next({
      state: TimerState.Idle,
      currentRound: 1,
      timeRemaining: 0,
      isRunning: false,
      isPaused: false,
      totalElapsedTime: 0
    });
  }
  
  // Start a new round
  private startRound(): void {
    const currentStatus = this._status.value;
    
    this._status.next({
      ...currentStatus,
      state: TimerState.Round,
      timeRemaining: this._settings.roundTime,
      isPaused: false
    });
    
    this.tenSecondWarningSounded = false;
    this.soundService.playBellSound();
  }
  
  // Start rest period between rounds
  private startRest(): void {
    const currentStatus = this._status.value;
    
    // Check if this was the last round
    if (currentStatus.currentRound >= this._settings.totalRounds) {
      this.completeWorkout();
      return;
    }
    
    this._status.next({
      ...currentStatus,
      state: TimerState.Rest,
      timeRemaining: this._settings.restTime,
      isPaused: false
    });
    
    this.tenSecondWarningSounded = false;
    this.soundService.playBellSound();
  }
  
  // Complete the workout
  private completeWorkout(): void {
    const now = Date.now();
    const totalDurationMs = now - this.workoutStartTime;
    const totalDurationSeconds = Math.round(totalDurationMs / 1000);
    
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
    
    this._status.next({
      state: TimerState.Complete,
      currentRound: this._status.value.currentRound,
      timeRemaining: 0,
      isRunning: false,
      isPaused: false,
      totalElapsedTime: totalDurationSeconds
    });
  }
  
  // Handle the countdown logic with background tab support
  private startCountdown(): void {
    // Clear any existing timer
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
    
    // Set initial reference time
    this.lastTickTime = Date.now();
    
    // Reset 10-second warning flag
    this.tenSecondWarningSounded = false;
    
    // Run timer outside NgZone for better performance when tab is not in focus
    this.ngZone.runOutsideAngular(() => {
      this.timerInterval = setInterval(() => {
        const currentStatus = this._status.value;
        
        // Only process timer if running and not paused
        if (currentStatus.isRunning && !currentStatus.isPaused) {
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
                const timeRemaining = Math.max(0, currentStatus.timeRemaining - elapsedSeconds);
                
                // Play warning bell at 10 seconds remaining if not already sounded
                if (timeRemaining === 10 && !this.tenSecondWarningSounded) {
                  this.soundService.playBellSound();
                  this.tenSecondWarningSounded = true;
                }
                
                // Update status with new time
                this._status.next({
                  ...currentStatus,
                  timeRemaining
                });
                
                // Check if the countdown reached zero
                if (timeRemaining <= 0) {
                  // Play bell sound
                  this.soundService.playBellSound();
                  
                  switch (currentStatus.state) {
                    case TimerState.GettingReady:
                      // Preparation phase completed - start first round
                      this.startRound();
                      break;
                      
                    case TimerState.Rest:
                      // Rest period completed - move to next round
                      this._status.next({
                        ...currentStatus,
                        currentRound: currentStatus.currentRound + 1,
                        timeRemaining: 0
                      });
                      
                      if (this._status.value.currentRound > this._settings.totalRounds) {
                        // Workout completed
                        this.completeWorkout();
                      } else {
                        // Start next round
                        this.startRound();
                      }
                      break;
                      
                    case TimerState.Round:
                      // Round completed - start rest period
                      this.startRest();
                      break;
                  }
                }
              });
            }
          }
        }
      }, 200); // Check frequently for better accuracy
    });
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
}