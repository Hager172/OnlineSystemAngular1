import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Clientapprovals } from './clientapprovals';

describe('Clientapprovals', () => {
  let component: Clientapprovals;
  let fixture: ComponentFixture<Clientapprovals>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Clientapprovals]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Clientapprovals);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
