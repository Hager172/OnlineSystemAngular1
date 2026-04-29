import { TestBed } from '@angular/core/testing';

import { ClientApproval } from './client-approval';

describe('ClientApproval', () => {
  let service: ClientApproval;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ClientApproval);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
