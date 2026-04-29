import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Approvalexchange } from './approvalexchange';

describe('Approvalexchange', () => {
  let component: Approvalexchange;
  let fixture: ComponentFixture<Approvalexchange>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Approvalexchange]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Approvalexchange);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
