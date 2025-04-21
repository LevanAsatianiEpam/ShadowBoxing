import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { TimerService, TimerState } from '../../services/timer.service';

@Component({
  selector: 'app-timer-display',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './timer-display.component.html',
  styleUrls: ['./timer-display.component.css']
})
export class TimerDisplayComponent implements OnInit, OnDestroy {
  // Timer status variables
  currentRound: number = 1;
  totalRounds: number = 3;
  timeRemaining: number = 0;
  isResting: boolean = false;
  isGettingReady: boolean = false;
  
  // State enum for template use
  TimerState = TimerState;
  currentState: TimerState = TimerState.Idle;
  
  private subscription: Subscription | null = null;
  
  constructor(private timerService: TimerService) {}
  
  ngOnInit(): void {
    // Get initial settings
    const settings = this.timerService.settings;
    this.totalRounds = settings.totalRounds;
    
    // Subscribe to timer status changes
    this.subscription = this.timerService.status$.subscribe(status => {
      this.currentRound = status.currentRound;
      this.timeRemaining = status.timeRemaining;
      this.currentState = status.state;
      
      // Update derived states for template
      this.isResting = status.state === TimerState.Rest;
      this.isGettingReady = status.state === TimerState.GettingReady;
    });
  }
  
  ngOnDestroy(): void {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }
  
  // Format seconds to MM:SS display format
  formatTime(seconds: number): string {
    return this.timerService.formatTime(seconds);
  }
}