import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { WorkoutPreset } from '../models/workout-preset.model';

@Injectable({
  providedIn: 'root'
})
export class PresetService {
  private STORAGE_KEY = 'shadowBoxing_workoutPresets';
  private presets: WorkoutPreset[] = [];
  private presetsSubject = new BehaviorSubject<WorkoutPreset[]>([]);

  constructor() {
    this.loadFromLocalStorage();
  }

  private loadFromLocalStorage(): void {
    try {
      const storedPresets = localStorage.getItem(this.STORAGE_KEY);
      if (storedPresets) {
        // Convert string dates back to Date objects
        const parsedPresets = JSON.parse(storedPresets);
        this.presets = parsedPresets.map((preset: any) => ({
          ...preset,
          createdAt: new Date(preset.createdAt),
          updatedAt: new Date(preset.updatedAt)
        }));
        this.presetsSubject.next([...this.presets]);
      }
    } catch (error) {
      console.error('Error loading presets from localStorage:', error);
    }
  }

  private saveToLocalStorage(): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.presets));
    } catch (error) {
      console.error('Error saving presets to localStorage:', error);
    }
  }

  getPresets(): Observable<WorkoutPreset[]> {
    return this.presetsSubject.asObservable();
  }

  getPresetById(id: string): WorkoutPreset | undefined {
    return this.presets.find(preset => preset.id === id);
  }

  addPreset(preset: Omit<WorkoutPreset, 'id' | 'createdAt' | 'updatedAt'>): WorkoutPreset {
    const newPreset: WorkoutPreset = {
      ...preset,
      id: this.generateId(),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.presets.push(newPreset);
    this.presetsSubject.next([...this.presets]);
    this.saveToLocalStorage();

    return newPreset;
  }

  updatePreset(id: string, updates: Partial<WorkoutPreset>): WorkoutPreset | null {
    const index = this.presets.findIndex(preset => preset.id === id);
    
    if (index === -1) {
      return null;
    }

    const updatedPreset: WorkoutPreset = {
      ...this.presets[index],
      ...updates,
      updatedAt: new Date()
    };

    this.presets[index] = updatedPreset;
    this.presetsSubject.next([...this.presets]);
    this.saveToLocalStorage();

    return updatedPreset;
  }

  deletePreset(id: string): boolean {
    const index = this.presets.findIndex(preset => preset.id === id);
    
    if (index === -1) {
      return false;
    }

    this.presets.splice(index, 1);
    this.presetsSubject.next([...this.presets]);
    this.saveToLocalStorage();
    
    return true;
  }

  toggleFavorite(id: string): WorkoutPreset | null {
    const preset = this.getPresetById(id);
    if (!preset) {
      return null;
    }
    
    return this.updatePreset(id, { isFavorite: !preset.isFavorite });
  }

  private generateId(): string {
    // Generate a simple UUID
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
}