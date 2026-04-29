import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InvoicePrint } from './invoice-print';

describe('InvoicePrint', () => {
  let component: InvoicePrint;
  let fixture: ComponentFixture<InvoicePrint>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InvoicePrint]
    })
    .compileComponents();

    fixture = TestBed.createComponent(InvoicePrint);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
