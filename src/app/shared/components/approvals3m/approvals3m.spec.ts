import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Approvals3m } from './approvals3m';

describe('Approvals3m', () => {
  let component: Approvals3m;
  let fixture: ComponentFixture<Approvals3m>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Approvals3m]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Approvals3m);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
