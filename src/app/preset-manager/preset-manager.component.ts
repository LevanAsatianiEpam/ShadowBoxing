import { Component, OnInit, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PresetService } from '../services/preset.service';
import { WorkoutPreset, DEFAULT_CATEGORIES } from '../models/workout-preset.model';

@Component({
  selector: 'app-preset-manager',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './preset-manager.component.html',
  styleUrl: './preset-manager.component.css'
})
export class PresetManagerComponent implements OnInit {
  @Output() presetSelected = new EventEmitter<WorkoutPreset>();
  @Output() closeRequested = new EventEmitter<void>();

  presets: WorkoutPreset[] = [];
  filteredPresets: WorkoutPreset[] = [];
  categories = DEFAULT_CATEGORIES;
  selectedCategory: string = '';
  showFavoritesOnly: boolean = false;
  sortBy: 'name' | 'date' | 'category' = 'date';

  // New preset form
  isCreatingPreset: boolean = false;
  isEditingPreset: boolean = false;
  currentPreset: WorkoutPreset | null = null;
  
  newPresetName: string = '';
  newPresetCategory: string = this.categories[0];
  newPresetRounds: number = 3;
  newPresetRoundTime: number = 180;
  newPresetRestTime: number = 60;
  customCategory: string = '';
  
  // Music settings for preset
  newPresetMusicEnabled: boolean = false;
  newPresetMusicSource: 'local' | 'youtube' = 'local';
  newPresetMusicUrl: string = '';

  constructor(private presetService: PresetService) {}

  ngOnInit(): void {
    this.loadPresets();
  }

  loadPresets(): void {
    this.presetService.getPresets().subscribe(presets => {
      this.presets = presets;
      this.applyFilters();
    });
  }

  applyFilters(): void {
    let filtered = [...this.presets];

    if (this.selectedCategory) {
      filtered = filtered.filter(preset => preset.category === this.selectedCategory);
    }

    if (this.showFavoritesOnly) {
      filtered = filtered.filter(preset => preset.isFavorite);
    }

    // Apply sorting
    switch (this.sortBy) {
      case 'name':
        filtered.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'category':
        filtered.sort((a, b) => a.category.localeCompare(b.category));
        break;
      case 'date':
      default:
        filtered.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
        break;
    }

    this.filteredPresets = filtered;
  }

  onCategoryChange(): void {
    this.applyFilters();
  }

  onFavoritesToggle(): void {
    this.showFavoritesOnly = !this.showFavoritesOnly;
    this.applyFilters();
  }

  onSortChange(): void {
    this.applyFilters();
  }

  selectPreset(preset: WorkoutPreset): void {
    this.presetSelected.emit(preset);
    this.closeRequested.emit();
  }

  toggleFavorite(event: Event, preset: WorkoutPreset): void {
    event.stopPropagation();
    this.presetService.toggleFavorite(preset.id);
  }

  startCreatePreset(): void {
    this.resetForm();
    this.isCreatingPreset = true;
    this.isEditingPreset = false;
    this.currentPreset = null;
  }

  startEditPreset(event: Event, preset: WorkoutPreset): void {
    event.stopPropagation();
    this.isCreatingPreset = false;
    this.isEditingPreset = true;
    this.currentPreset = preset;
    
    this.newPresetName = preset.name;
    this.newPresetCategory = preset.category;
    this.newPresetRounds = preset.totalRounds;
    this.newPresetRoundTime = preset.roundTime;
    this.newPresetRestTime = preset.restTime;
    
    // Handle custom categories
    if (!this.categories.includes(preset.category)) {
      this.newPresetCategory = 'Custom';
      this.customCategory = preset.category;
    }
    
    // Set music settings
    this.newPresetMusicEnabled = preset.musicEnabled || false;
    this.newPresetMusicSource = preset.musicSource || 'local';
    this.newPresetMusicUrl = preset.musicUrl || '';
  }

  cancelEdit(): void {
    this.isCreatingPreset = false;
    this.isEditingPreset = false;
    this.currentPreset = null;
    this.resetForm();
  }

  savePreset(): void {
    // Validate form
    if (!this.newPresetName.trim()) {
      alert('Please enter a name for the preset');
      return;
    }
    
    // Validate YouTube URL if selected and enabled
    if (this.newPresetMusicEnabled && 
        this.newPresetMusicSource === 'youtube' && 
        this.newPresetMusicUrl.trim() === '') {
      alert('Please enter a YouTube URL for your music');
      return;
    }

    const finalCategory = this.newPresetCategory === 'Custom' && this.customCategory 
      ? this.customCategory 
      : this.newPresetCategory;
    
    if (this.isEditingPreset && this.currentPreset) {
      this.presetService.updatePreset(this.currentPreset.id, {
        name: this.newPresetName,
        category: finalCategory,
        totalRounds: this.newPresetRounds,
        roundTime: this.newPresetRoundTime,
        restTime: this.newPresetRestTime,
        // Include music settings
        musicEnabled: this.newPresetMusicEnabled,
        musicSource: this.newPresetMusicSource,
        musicUrl: this.newPresetMusicUrl
      });
    } else {
      this.presetService.addPreset({
        name: this.newPresetName,
        category: finalCategory,
        totalRounds: this.newPresetRounds,
        roundTime: this.newPresetRoundTime,
        restTime: this.newPresetRestTime,
        // Include music settings
        musicEnabled: this.newPresetMusicEnabled,
        musicSource: this.newPresetMusicSource,
        musicUrl: this.newPresetMusicUrl
      });
    }

    this.cancelEdit();
  }

  deletePreset(event: Event, preset: WorkoutPreset): void {
    event.stopPropagation();
    if (confirm(`Are you sure you want to delete "${preset.name}"?`)) {
      this.presetService.deletePreset(preset.id);
    }
  }

  resetForm(): void {
    this.newPresetName = '';
    this.newPresetCategory = this.categories[0];
    this.newPresetRounds = 3;
    this.newPresetRoundTime = 180;
    this.newPresetRestTime = 60;
    this.customCategory = '';
    
    // Reset music settings
    this.newPresetMusicEnabled = false;
    this.newPresetMusicSource = 'local';
    this.newPresetMusicUrl = '';
  }

  close(): void {
    this.closeRequested.emit();
  }

  formatTime(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }
}