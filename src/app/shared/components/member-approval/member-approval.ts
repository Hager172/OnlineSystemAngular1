import { Component, computed, signal } from '@angular/core';
import { Approval } from '../../interfaces/approval/approval';
import { FormsModule } from '@angular/forms';
import { ApprovalService } from '../../../core/services/Approval/approval-service';
import { PopupService } from '../../../core/services/popup/popup-service';

interface NewApprovalForm {
  title: string;
  description: string;
  expiryDate: string;
  items: { name: string; quantity: number; price: string }[];
}

@Component({
  selector: 'app-member-approval',
  imports: [FormsModule],
  templateUrl: './member-approval.html',
  styleUrl: './member-approval.css'
})
export class MemberApproval {
  // --- Search ---
  searchValue = '';
  readonly searchType = signal<'member' | 'approval' | null>(null);
  readonly showResults = signal(false);

  // --- Results ---
  readonly currentMemberId = signal('');
  readonly memberApprovals = signal<Approval[]>([]);
  readonly currentApproval = signal<Approval | null>(null);

  // --- View dialog: the selected approval IS the open state, no extra flag ---
  readonly selectedApproval = signal<Approval | null>(null);

  // --- Add dialog ---
  readonly isAddOpen = signal(false);
  newApproval: NewApprovalForm = this.createEmptyForm();

  // --- Derived view conditions (kept out of the template) ---
  readonly showApprovalDetail = computed(
    () => this.showResults() && this.searchType() === 'approval' && !!this.currentApproval()
  );
  readonly showMemberResults = computed(
    () => this.showResults() && this.searchType() === 'member'
  );

  constructor(
    private approvalService: ApprovalService,
    private popup: PopupService
  ) {}

  searchById(searchId?: string): void {
    const value = (searchId ?? this.searchValue).trim();
    if (!value) return;

    const isApprovalId = value.startsWith('APR');

    this.approvalService.getMemberApprovals(value).subscribe({
      next: (res) => {
        if (!res?.success || !res.data) {
          this.popup.error(isApprovalId ? 'Approval not found' : 'No approvals found');
          return;
        }

        if (isApprovalId) {
          this.searchType.set('approval');
          this.currentApproval.set(this.mapApproval(res.data));
        } else {
          this.searchType.set('member');
          this.currentMemberId.set(res.data.memberId);
          this.memberApprovals.set(
            (res.data.approvals ?? []).map((a: any) => this.mapApproval(a))
          );
        }

        this.showResults.set(true);
      },
      error: (err) => {
        console.error('searchById failed', err);
        this.popup.error('Error fetching approvals');
      }
    });
  }

  private mapApproval(a: any): Approval {
    return {
      approvalNumber: a.approvalNumber?.toString(),
      memberId: a.memberId,
      date: new Date(a.approvalDate).toLocaleDateString(),
      expiryDate: a.expiryDate ? new Date(a.expiryDate).toLocaleDateString() : '',
      notes: a.notes,
      itemCount: a.itemCount,
      items: (a.items ?? []).map((i: any) => ({
        id: i.id,
        name: i.description,
        quantity: i.quantity,
        unitPrice: i.unitPrice
      }))
    };
  }

  // --- View dialog ---
  openView(approval: Approval): void {
    // Setting a signal notifies change detection immediately, so the correct
    // details render on the first click (zoneless change detection).
    this.selectedApproval.set(approval);
  }

  closeView(): void {
    this.selectedApproval.set(null);
  }

  // --- Add dialog ---
  openAddDialog(): void {
    this.isAddOpen.set(true);
  }

  closeAddDialog(): void {
    this.isAddOpen.set(false);
    this.newApproval = this.createEmptyForm();
  }

  addItem(): void {
    this.newApproval.items.push({ name: '', quantity: 1, price: '' });
  }

  removeItem(index: number): void {
    if (this.newApproval.items.length > 1) {
      this.newApproval.items.splice(index, 1);
    }
  }

  handleContinue(): void {
    this.popup.info('Approval confirmed - The approval process will continue.');
  }

  handleCancel(): void {
    this.showResults.set(false);
    this.searchType.set(null);
    this.currentApproval.set(null);
  }

  private createEmptyForm(): NewApprovalForm {
    return {
      title: '',
      description: '',
      expiryDate: '',
      items: [{ name: '', quantity: 1, price: '' }]
    };
  }
}
