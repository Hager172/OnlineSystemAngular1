import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApprovalService } from '../../../../core/services/Approval/approval-service';
import { Approval } from '../../../../core/services/Approval/approval';
import { PopupService } from '../../../../core/services/popup/popup-service';

@Component({
  selector: 'app-approval-input',
  imports: [CommonModule, FormsModule],
  templateUrl: './approval-input.html',
  styleUrl: './approval-input.css',
})
export class ApprovalInput implements OnInit {
  approvalNumber: string = '';
  isModalOpen: boolean = false;
  error: string = '';

  constructor(
    private router: Router,
    private approvalService: ApprovalService,
    private popup: PopupService
  ) {}
ngOnInit(): void {
  const state = window.history.state as any;

  if (state?.backData?.approvalNumber) {
    this.approvalNumber = state.backData.approvalNumber;
    console.log('Prefilled Approval Number from previous page:', this.approvalNumber);
  }
}
  onSubmit(): void {
    if (!this.approvalNumber.trim()) {
      this.error = 'Please enter an approval number';
      return;
    }
    this.error = '';
    this.isModalOpen = true;
  }

  onNewApproval(): void {
    this.isModalOpen = false;
    this.popup.info('Create new approval functionality - coming soon!');
  }

  onDisplayApproval(): void {
    this.isModalOpen = false;
    
    if (!this.approvalService.approvalExists(this.approvalNumber)) {
      this.error = `Approval ${this.approvalNumber} not found. Try: APR-001, APR-002, or APR-003`;
      return;
    }
    
    this.router.navigate(['/approval-edit', this.approvalNumber]);
  }

  closeModal(): void {
    this.isModalOpen = false;
  }

}
