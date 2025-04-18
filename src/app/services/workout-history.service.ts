import { Injectable } from '@angular/core';
import { WorkoutHistory, WorkoutIntensity, WorkoutStats, CALORIE_BURN_RATES, UserProfile } from '../models/workout-history.model';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class WorkoutHistoryService {
  private STORAGE_KEY = 'shadowboxing-workout-history';
  private USER_PROFILE_KEY = 'shadowboxing-user-profile';
  private workoutHistory: WorkoutHistory[] = [];
  private workoutHistorySubject = new BehaviorSubject<WorkoutHistory[]>([]);
  
  // Default user profile values
  private userProfile: UserProfile = {
    weight: 70, // Default weight in kg
    height: 175, // Default height in cm
    gender: 'male',
    age: 30
  };

  constructor() {
    this.loadHistory();
    this.loadUserProfile();
  }

  private loadHistory(): void {
    const storedHistory = localStorage.getItem(this.STORAGE_KEY);
    if (storedHistory) {
      try {
        // Parse the JSON and convert date strings back to Date objects
        const parsedHistory = JSON.parse(storedHistory);
        this.workoutHistory = parsedHistory.map(workout => ({
          ...workout,
          date: new Date(workout.date)
        }));
        this.workoutHistorySubject.next([...this.workoutHistory]);
      } catch (error) {
        console.error('Error loading workout history:', error);
        this.workoutHistory = [];
        this.workoutHistorySubject.next([]);
      }
    }
  }
  
  private loadUserProfile(): void {
    const storedProfile = localStorage.getItem(this.USER_PROFILE_KEY);
    if (storedProfile) {
      try {
        this.userProfile = JSON.parse(storedProfile);
      } catch (error) {
        console.error('Error loading user profile:', error);
      }
    }
  }

  private saveHistory(): void {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.workoutHistory));
    this.workoutHistorySubject.next([...this.workoutHistory]);
  }
  
  private saveUserProfile(): void {
    localStorage.setItem(this.USER_PROFILE_KEY, JSON.stringify(this.userProfile));
  }

  // Add a new workout to history
  addWorkout(workout: Omit<WorkoutHistory, 'id' | 'date'>): void {
    const newWorkout: WorkoutHistory = {
      ...workout,
      id: this.generateId(),
      date: new Date()
    };

    this.workoutHistory.unshift(newWorkout); // Add to beginning of array
    this.saveHistory();
  }

  // Delete a workout from history
  deleteWorkout(id: string): void {
    this.workoutHistory = this.workoutHistory.filter(workout => workout.id !== id);
    this.saveHistory();
  }

  // Get all workout history
  getWorkoutHistory(): Observable<WorkoutHistory[]> {
    return this.workoutHistorySubject.asObservable();
  }

  // Get user profile
  getUserProfile(): UserProfile {
    return {...this.userProfile};
  }
  
  // Update user profile
  updateUserProfile(profile: Partial<UserProfile>): void {
    this.userProfile = {
      ...this.userProfile,
      ...profile
    };
    this.saveUserProfile();
  }

  // Calculate calories burned based on workout duration, intensity, and user metrics
  calculateCaloriesBurned(durationSeconds: number, intensity: string): number {
    // Convert seconds to minutes
    const durationMinutes = durationSeconds / 60;
    
    // Get the base calorie burn rate based on intensity
    const baseCalorieRate = CALORIE_BURN_RATES[intensity as WorkoutIntensity] || CALORIE_BURN_RATES[WorkoutIntensity.Medium];
    
    // Calculate BMR (Basal Metabolic Rate) using the Harris-Benedict equation
    // This helps adjust calorie burn based on user's physical attributes
    let bmrFactor = 1.0; // Default factor
    
    if (this.userProfile.weight && this.userProfile.height) {
      const { weight, height, age, gender } = this.userProfile;
      
      // BMR calculation using simplified Harris-Benedict formula
      if (gender === 'male') {
        // Male: BMR = 88.362 + (13.397 × weight in kg) + (4.799 × height in cm) - (5.677 × age in years)
        const bmr = 88.362 + (13.397 * weight) + (4.799 * height) - (5.677 * (age || 30));
        // Create a factor based on average BMR (approx 1700 for males)
        bmrFactor = bmr / 1700;
      } else {
        // Female: BMR = 447.593 + (9.247 × weight in kg) + (3.098 × height in cm) - (4.330 × age in years)
        const bmr = 447.593 + (9.247 * weight) + (3.098 * height) - (4.330 * (age || 30));
        // Create a factor based on average BMR (approx 1400 for females)
        bmrFactor = bmr / 1400;
      }
    }
    
    // Adjust the calorie burn rate based on the BMR factor
    const adjustedCalorieRate = baseCalorieRate * bmrFactor;
    
    // Calculate and round to the nearest whole number
    return Math.round(durationMinutes * adjustedCalorieRate);
  }

  // Generate workout statistics
  getWorkoutStats(): WorkoutStats {
    const now = new Date();
    const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const thisWeekWorkouts = this.workoutHistory.filter(w => w.date >= startOfWeek);
    const thisMonthWorkouts = this.workoutHistory.filter(w => w.date >= startOfMonth);

    const totalTimeInSeconds = this.workoutHistory.reduce((sum, workout) => sum + workout.duration, 0);
    const totalCaloriesBurned = this.workoutHistory.reduce((sum, workout) => sum + workout.caloriesBurned, 0);
    
    const thisWeekTimeInSeconds = thisWeekWorkouts.reduce((sum, workout) => sum + workout.duration, 0);
    const thisWeekCaloriesBurned = thisWeekWorkouts.reduce((sum, workout) => sum + workout.caloriesBurned, 0);

    return {
      totalWorkouts: this.workoutHistory.length,
      totalTimeInSeconds,
      totalCaloriesBurned,
      thisWeekWorkouts: thisWeekWorkouts.length,
      thisWeekTimeInSeconds,
      thisWeekCaloriesBurned,
      thisMonthWorkouts: thisMonthWorkouts.length,
      avgWorkoutDuration: this.workoutHistory.length > 0 ? totalTimeInSeconds / this.workoutHistory.length : 0
    };
  }

  // Helper method to generate a unique ID
  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
  }
}