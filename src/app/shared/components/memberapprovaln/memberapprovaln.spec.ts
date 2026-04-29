import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Memberapprovaln } from './memberapprovaln';

describe('Memberapprovaln', () => {
  let component: Memberapprovaln;
  let fixture: ComponentFixture<Memberapprovaln>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Memberapprovaln]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Memberapprovaln);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
