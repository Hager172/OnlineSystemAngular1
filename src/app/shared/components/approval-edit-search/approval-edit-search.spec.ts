import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ApprovalEditSearch } from './approval-edit-search';

describe('ApprovalEditSearch', () => {
  let component: ApprovalEditSearch;
  let fixture: ComponentFixture<ApprovalEditSearch>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ApprovalEditSearch]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ApprovalEditSearch);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
