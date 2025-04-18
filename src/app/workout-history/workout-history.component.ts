import { Component, OnInit } from '@angular/core';
import { WorkoutHistoryService } from '../services/workout-history.service';
import { WorkoutHistory, WorkoutStats } from '../models/workout-history.model';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-workout-history',
  templateUrl: './workout-history.component.html',
  imports: [CommonModule],
  styleUrls: ['./workout-history.component.css']
})
export class WorkoutHistoryComponent implements OnInit {
  workoutHistory: WorkoutHistory[] = [];
  stats: WorkoutStats | null = null;
  isDetailView = false;
  selectedWorkout: WorkoutHistory | null = null;
  
  constructor(private workoutHistoryService: WorkoutHistoryService) {}

  ngOnInit(): void {
    this.loadHistory();
  }

  loadHistory(): void {
    this.workoutHistoryService.getWorkoutHistory().subscribe(history => {
      this.workoutHistory = history;
      this.stats = this.workoutHistoryService.getWorkoutStats();
    });
  }

  deleteWorkout(id: string, event: Event): void {
    event.stopPropagation(); // Prevent opening the detail view
    if (confirm('Are you sure you want to delete this workout?')) {
      this.workoutHistoryService.deleteWorkout(id);
    }
  }

  viewWorkoutDetail(workout: WorkoutHistory): void {
    this.selectedWorkout = workout;
    this.isDetailView = true;
  }

  closeDetailView(): void {
    this.isDetailView = false;
    this.selectedWorkout = null;
  }

  // Format seconds into readable time (HH:MM:SS)
  formatTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    return [
      hours > 0 ? hours.toString().padStart(2, '0') : null,
      minutes.toString().padStart(2, '0'),
      secs.toString().padStart(2, '0')
    ]
      .filter(Boolean)
      .join(':');
  }

  // Format date
  formatDate(date: Date): string {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }
}