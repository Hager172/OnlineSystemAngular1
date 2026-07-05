import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

import { RequestDetails } from '../request-details/request-details';
import { RequestAttachments } from '../request-attachments/request-attachments';
import { RequestServices } from '../request-services/request-services';

import { RequestStateService } from '../../../core/services/request-state/request-state';

@Component({
  selector: 'app-issue-approval',
  standalone: true,
  imports: [
    CommonModule,
    RequestDetails,
    RequestAttachments,
    RequestServices
  ],
  providers: [RequestStateService],
  templateUrl: './issue-approval.html',
  styleUrl: './issue-approval.css',
})
export class IssueApproval {
  constructor(public state: RequestStateService) {}

  saveDraft(): void {
    console.log('Save Draft');
    console.log(this.state);
  }

  submitRequest(): void {
    console.log('Submit Request');
    console.log(this.state);

    // هنا بعدين هنبعت الـ API
  }

  cancel(): void {
    if (confirm('Are you sure you want to cancel?')) {
      this.state.reset();
    }
  }
}