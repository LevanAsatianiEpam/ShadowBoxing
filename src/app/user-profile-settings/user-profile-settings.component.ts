import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserProfile } from '../models/workout-history.model';
import { WorkoutHistoryService } from '../services/workout-history.service';

@Component({
  selector: 'app-user-profile-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './user-profile-settings.component.html',
  styleUrls: ['./user-profile-settings.component.css']
})
export class UserProfileSettingsComponent implements OnInit {
  @Output() closeModal = new EventEmitter<void>();
  
  profile: UserProfile = {
    weight: 70,
    height: 175,
    gender: 'male',
    age: 30
  };
  
  constructor(private workoutHistoryService: WorkoutHistoryService) {}
  
  ngOnInit(): void {
    // Load user profile from service
    const savedProfile = this.workoutHistoryService.getUserProfile();
    if (savedProfile) {
      this.profile = { ...savedProfile };
    }
  }
  
  saveProfile(): void {
    // Save profile to service
    this.workoutHistoryService.updateUserProfile(this.profile);
    this.close();
  }
  
  close(): void {
    this.closeModal.emit();
  }
}
