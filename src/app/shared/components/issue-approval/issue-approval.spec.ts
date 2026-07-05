import { ComponentFixture, TestBed } from '@angular/core/testing';

import { IssueApproval } from './issue-approval';

describe('IssueApproval', () => {
  let component: IssueApproval;
  let fixture: ComponentFixture<IssueApproval>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [IssueApproval]
    })
    .compileComponents();

    fixture = TestBed.createComponent(IssueApproval);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
