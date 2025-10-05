import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HabitatDesignerComponent } from './habitat-designer.component';

describe('HabitatDesignerComponent', () => {
  let component: HabitatDesignerComponent;
  let fixture: ComponentFixture<HabitatDesignerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [HabitatDesignerComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(HabitatDesignerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
