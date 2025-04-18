import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BoxingTimerComponent } from './boxing-timer.component';

describe('BoxingTimerComponent', () => {
  let component: BoxingTimerComponent;
  let fixture: ComponentFixture<BoxingTimerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BoxingTimerComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BoxingTimerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
