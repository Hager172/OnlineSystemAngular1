import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Languageswitcher } from './languageswitcher';

describe('Languageswitcher', () => {
  let component: Languageswitcher;
  let fixture: ComponentFixture<Languageswitcher>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Languageswitcher]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Languageswitcher);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
