import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ApprovalResultComponent } from './approval-result';

describe('ApprovalResult', () => {
  let component: ApprovalResultComponent;
  let fixture: ComponentFixture<ApprovalResultComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ApprovalResultComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ApprovalResultComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
