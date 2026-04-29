import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MemberApproval } from './member-approval';

describe('MemberApproval', () => {
  let component: MemberApproval;
  let fixture: ComponentFixture<MemberApproval>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MemberApproval]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MemberApproval);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
