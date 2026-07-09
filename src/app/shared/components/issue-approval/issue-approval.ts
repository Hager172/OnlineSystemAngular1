import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

import { RequestDetails } from '../request-details/request-details';
import { RequestAttachments } from '../request-attachments/request-attachments';
import { RequestServices } from '../request-services/request-services';
import { ApprovalService } from '../../../core/services/Approval/approval-service';
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
  providers: [RequestStateService, ApprovalService],
  templateUrl: './issue-approval.html',
  styleUrl: './issue-approval.css',
})
export class IssueApproval {
  constructor(public state: RequestStateService, public approvalService: ApprovalService  ) {}

  saveDraft(): void {
    console.log('Save Draft');
    console.log(this.state);
  }

  submitRequest(): void {

  const claim = {
    membId: this.state.member()?.memberId ?? '',
    serviceDate: new Date(this.state.approvalDate()),
    presId: this.state.selectedVendor()?.id ?? '',
    phone: this.state.member()?.mobile ?? '',
    diagnosisString: this.state.diagnosisIds().join(','),
    diagnosisInsString: this.state.diagnosisIds().join(','),
    notes: this.state.notes(),

    services: this.state.serviceRows().map(x => ({
      productId: Number(x.serviceId ?? 0),
      qty: x.qty ?? 0,
      price: x.itemPrice ?? 0,
      units: x.units ?? 0,
      rep: x.repeat ?? 0,
      duration: x.duration ?? 0
    }))
  };

  console.log('Claim:', claim);
this.approvalService.createRequestClaim(claim).subscribe({
  next: (res) => {
    if (res.success) {
      alert(res.message);
      this.state.reset();
    }
  },
  error: (err) => {
    console.error(err);
  }
});

}
  cancel(): void {
    if (confirm('Are you sure you want to cancel?')) {
      this.state.reset();
    }
  }
}