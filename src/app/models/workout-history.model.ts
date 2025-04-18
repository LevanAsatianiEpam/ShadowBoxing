export interface WorkoutHistory {
  id: string;          // Unique identifier
  date: Date;          // Date and time of workout
  duration: number;    // Total duration in seconds
  rounds: number;      // Number of rounds completed
  roundTime: number;   // Duration of each round in seconds
  restTime: number;    // Rest duration between rounds in seconds
  intensity: string;   // Low, Medium, or High
  caloriesBurned: number; // Estimated calories burned
  notes?: string;      // Optional notes about the workout
  presetName?: string; // Name of the preset used (if any)
}

export enum WorkoutIntensity {
  Low = 'Low',
  Medium = 'Medium',
  High = 'High'
}

export interface WorkoutStats {
  totalWorkouts: number;
  totalTimeInSeconds: number;
  totalCaloriesBurned: number;
  thisWeekWorkouts: number;
  thisWeekTimeInSeconds: number;
  thisWeekCaloriesBurned: number;
  thisMonthWorkouts: number;
  avgWorkoutDuration: number;
}

export interface UserProfile {
  weight: number;     // Weight in kg
  height: number;     // Height in cm
  gender?: 'male' | 'female'; // Optional gender for BMR calculation
  age?: number;       // Optional age for BMR calculation
}

export const CALORIE_BURN_RATES = {
  // Calories burned per minute based on intensity
  [WorkoutIntensity.Low]: 5, // Approx. ~300 calories/hour
  [WorkoutIntensity.Medium]: 8, // Approx. ~480 calories/hour  
  [WorkoutIntensity.High]: 12 // Approx. ~720 calories/hour
};