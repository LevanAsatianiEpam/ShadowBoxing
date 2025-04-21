import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { TimerService, TimerState } from '../../services/timer.service';

@Component({
  selector: 'app-timer-controls',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './timer-controls.component.html',
  styleUrls: ['./timer-controls.component.css']
})
export class TimerControlsComponent implements OnInit, OnDestroy {
  isRunning: boolean = false;
  isPaused: boolean = false;
  isCompleted: boolean = false;
  
  private subscription: Subscription | null = null;
  
  constructor(private timerService: TimerService) {}
  
  ngOnInit(): void {
    this.subscription = this.timerService.status$.subscribe(status => {
      this.isRunning = status.isRunning;
      this.isPaused = status.isPaused;
      this.isCompleted = status.state === TimerState.Complete;
    });
  }
  
  ngOnDestroy(): void {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }
  
  startTimer(): void {
    this.timerService.start();
  }
  
  pauseResumeTimer(): void {
    this.timerService.togglePause();
  }
  
  resetTimer(): void {
    this.timerService.reset();
  }
}