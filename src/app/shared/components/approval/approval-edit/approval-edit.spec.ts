import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ApprovalEdit } from './approval-edit';

describe('ApprovalEdit', () => {
  let component: ApprovalEdit;
  let fixture: ComponentFixture<ApprovalEdit>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ApprovalEdit]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ApprovalEdit);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
