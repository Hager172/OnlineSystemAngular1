import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Addapproval } from './addapproval';

describe('Addapproval', () => {
  let component: Addapproval;
  let fixture: ComponentFixture<Addapproval>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Addapproval]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Addapproval);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
