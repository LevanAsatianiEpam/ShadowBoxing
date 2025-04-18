export interface WorkoutPreset {
  id: string;
  name: string;
  category: string;
  totalRounds: number;
  roundTime: number;
  restTime: number;
  createdAt: Date;
  updatedAt: Date;
  isFavorite?: boolean;
  // Music settings
  musicEnabled: boolean;
  musicSource: 'local' | 'youtube';
  musicUrl?: string;
}

export const DEFAULT_CATEGORIES = [
  'Shadow Boxing',
  'Heavy Bag',
  'Speed Bag',
  'Cardio',
  'Abs Workout',
  'Strength Training',
  'Footwork',
  'Custom'
];