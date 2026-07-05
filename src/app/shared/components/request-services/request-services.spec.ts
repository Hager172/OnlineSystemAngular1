import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RequestServices } from './request-services';

describe('RequestServices', () => {
  let component: RequestServices;
  let fixture: ComponentFixture<RequestServices>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RequestServices]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RequestServices);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
