import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RequestAttachments } from './request-attachments';

describe('RequestAttachments', () => {
  let component: RequestAttachments;
  let fixture: ComponentFixture<RequestAttachments>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RequestAttachments]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RequestAttachments);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
