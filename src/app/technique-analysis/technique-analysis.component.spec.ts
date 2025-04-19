import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TechniqueAnalysisComponent } from './technique-analysis.component';

describe('TechniqueAnalysisComponent', () => {
  let component: TechniqueAnalysisComponent;
  let fixture: ComponentFixture<TechniqueAnalysisComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TechniqueAnalysisComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TechniqueAnalysisComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
