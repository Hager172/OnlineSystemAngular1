import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ApprovalService } from '../../../core/services/Approval/approval-service';
import { AuthService } from '../../../core/services/auth/auth-service';

interface ApprovalItem {
  id: number;
  memberId: string;
  memberName: string;
  requestType: string;
  client: string;
  submittedDate: string;
  submittedTime: string;
  status: 'pending' | 'approved';
  note: string;
}

interface Approval {
  approvalNumber: string;
  memberId: string;
  date: string;
  expiryDate: string;
  notes: string;
  itemCount: number;
  items: any[];
}

interface ManualItem {
  id: string;
  title: string;
  description: string;
}

@Component({
  selector: 'app-memberapprovaln',
  standalone: true,
  imports: [FormsModule, RouterModule],
  templateUrl: './memberapprovaln.html',
  styleUrls: ['./memberapprovaln.css']
})
export class Memberapprovaln implements OnInit {

  // --- Worklist data ---
  readonly pendingApprovals = signal<ApprovalItem[]>([]);
  readonly approvedApprovals = signal<ApprovalItem[]>([]);
  readonly activeTab = signal<'pending' | 'approved'>('pending');
  readonly currentPage = signal(1);
  readonly itemsPerPage = 5;
  searchQuery = '';

  // --- Lookup ---
  readonly lookupType = signal<'memberId' | 'approvalId'>('memberId');
  lookupValue = '';
  readonly searchType = signal<'member' | 'approval' | null>(null);
  readonly showResults = signal(false);
  readonly error = signal('');
  readonly isModalOpen = signal(false);

  // --- Lookup results ---
  readonly currentMemberId = signal('');
  readonly memberApprovals = signal<Approval[]>([]);
  readonly currentApproval = signal<Approval | null>(null);

  // --- Context ---
  currentDate = '';
  private clientid = '';
  private vendorid = '';

  // --- User manual ---
  readonly manualItems: ManualItem[] = [
    { id: 'quick-guide', title: 'Quick Guide', description: 'Learn the basics of using the approval system' },
    { id: 'video', title: 'Video Tutorials', description: 'Watch step-by-step video instructions' },
    { id: 'faqs', title: 'FAQs', description: 'Find answers to commonly asked questions' },
    { id: 'docs', title: 'Complete Documentation', description: 'Access the full user manual and documentation' }
  ];

  readonly guideImages: string[] = [
    'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&q=80',
    'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&q=80',
    'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800&q=80'
  ];

  readonly activeManualSection = signal<string | null>(null);
  readonly currentImageIndex = signal(0);

  constructor(
    private approvalService: ApprovalService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.updateDate();
    this.loadMemberContext();
  }

  private loadMemberContext(): void {
    const clientid = this.authService.getclientid();
    if (!clientid) {
      this.error.set('Vendor ID not found');
      return;
    }
    this.clientid = clientid;
    this.vendorid = this.authService.getVendorId() ?? '';
    this.switchTab('approved');
  }

  // ============================================================
  // Worklist
  // ============================================================
  switchTab(tab: 'pending' | 'approved'): void {
    this.activeTab.set(tab);
    this.currentPage.set(1);
    this.searchQuery = '';

    if (tab === 'pending') {
      this.loadPendingApprovals();
    } else {
      this.loadApprovedApprovals();
    }
  }

  private loadPendingApprovals(): void {
    this.approvalService.getTodayNotCompletedApprovals(this.clientid, this.vendorid).subscribe({
      next: (response) => this.pendingApprovals.set(this.mapWorklist(response, 'pending')),
      error: () => this.pendingApprovals.set([])
    });
  }

  private loadApprovedApprovals(): void {
    this.approvalService.getTodayCompletedApprovals(this.clientid, this.vendorid).subscribe({
      next: (response) => this.approvedApprovals.set(this.mapWorklist(response, 'approved')),
      error: () => this.approvedApprovals.set([])
    });
  }

  private mapWorklist(response: any, status: 'pending' | 'approved'): ApprovalItem[] {
    const rows = Array.isArray(response?.data?.approvals) ? response.data.approvals : [];
    return rows.map((item: any) => ({
      id: item.id || item.approvalId,
      memberId: item.memberid,
      memberName: item.membername,
      requestType: item.apptype || 'General Request',
      client: item.membername,
      submittedDate: this.formatDate(item.approval_date),
      submittedTime: this.formatTime(item.approval_date),
      status,
      note: item.note
    }));
  }

  /** Active tab's rows filtered by the search box. */
  get filteredItems(): ApprovalItem[] {
    const source = this.activeTab() === 'pending' ? this.pendingApprovals() : this.approvedApprovals();
    const query = this.searchQuery.trim().toLowerCase();
    if (!query) return source;

    return source.filter(item =>
      item.id?.toString().includes(query) ||
      item.memberId?.toLowerCase().includes(query) ||
      item.memberName?.toLowerCase().includes(query) ||
      item.requestType?.toLowerCase().includes(query) ||
      item.client?.toLowerCase().includes(query)
    );
  }

  /** Current page slice of the filtered rows. */
  get currentItems(): ApprovalItem[] {
    const start = (this.currentPage() - 1) * this.itemsPerPage;
    return this.filteredItems.slice(start, start + this.itemsPerPage);
  }

  get totalCount(): number {
    return this.filteredItems.length;
  }

  get totalPages(): number {
    return Math.ceil(this.totalCount / this.itemsPerPage);
  }

  get pagesArray(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }

  get showingFrom(): number {
    return this.totalCount === 0 ? 0 : (this.currentPage() - 1) * this.itemsPerPage + 1;
  }

  get showingTo(): number {
    return Math.min(this.currentPage() * this.itemsPerPage, this.totalCount);
  }

  changePage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage.set(page);
    }
  }

  // ============================================================
  // Lookup
  // ============================================================
  selectLookupType(type: 'memberId' | 'approvalId'): void {
    this.lookupType.set(type);
    this.lookupValue = '';
    this.showResults.set(false);
    this.searchType.set(null);
    this.currentApproval.set(null);
    this.memberApprovals.set([]);
    this.currentMemberId.set('');
    this.error.set('');
  }

  handleLookup(): void {
    const value = this.lookupValue.trim();
    if (!value) return;
    this.error.set('');

    if (this.lookupType() === 'approvalId') {
      this.lookupApproval(value);
    } else {
      this.lookupMember(value);
    }
  }

  private lookupApproval(value: string): void {
    this.approvalService.getApprovalDetails(value).subscribe({
      next: (res) => {
        this.searchType.set('approval');
        this.currentApproval.set(this.mapApprovalDetails(res));
        this.showResults.set(true);
      },
      error: (err) => {
        console.error('approval lookup failed', err);
        this.error.set('Approval not found');
        this.showResults.set(false);
        this.isModalOpen.set(true);
      }
    });
  }

  private lookupMember(value: string): void {
    this.approvalService.getMemberApprovals(value).subscribe({
      next: (res: any) => {
        if (res?.success && res.data) {
          this.searchType.set('member');
          this.currentMemberId.set(res.data.memberId);
          this.memberApprovals.set((res.data.approvals ?? []).map((a: any) => this.mapSingleApproval(a)));
          this.showResults.set(true);
        } else {
          this.error.set(res?.message || 'No approvals found');
          this.showResults.set(false);
          this.isModalOpen.set(true);
        }
      },
      error: (err) => {
        console.error('member lookup failed', err);
        this.error.set(err?.error?.message || 'Something went wrong');
        this.showResults.set(false);
        if (err?.error?.message === 'No approvals found') {
          this.isModalOpen.set(true);
        }
      }
    });
  }

  private mapApprovalDetails(a: any): Approval {
    const approvalDate = new Date(a.approvalDate);
    const expiryDate = new Date(approvalDate);
    expiryDate.setDate(expiryDate.getDate() + 7);

    return {
      approvalNumber: a.approvalId?.toString(),
      memberId: a.memberId,
      date: approvalDate.toLocaleDateString(),
      expiryDate: expiryDate.toLocaleDateString(),
      notes: a.notes,
      itemCount: a.services?.length || 0,
      items: a.services?.map((s: any) => ({
        id: s.serviceId,
        name: s.itemDesc || s.careItemName,
        quantity: s.apQty,
        unitPrice: s.price
      })) || []
    };
  }

  private mapSingleApproval(a: any): Approval {
    return {
      approvalNumber: a.approvalNumber?.toString(),
      memberId: a.memberId,
      date: new Date(a.approvalDate).toLocaleDateString(),
      expiryDate: a.expiryDate ? new Date(a.expiryDate).toLocaleDateString() : '',
      notes: a.notes,
      itemCount: a.itemCount,
      items: a.items?.map((i: any) => ({
        id: i.id,
        name: i.description,
        quantity: i.quantity,
        unitPrice: i.unitPrice
      })) || []
    };
  }

  closeModal(): void {
    this.isModalOpen.set(false);
  }

  // ============================================================
  // User manual
  // ============================================================
  toggleManualSection(sectionId: string): void {
    this.activeManualSection.set(this.activeManualSection() === sectionId ? null : sectionId);
    this.currentImageIndex.set(0);
  }

  selectImage(index: number): void {
    this.currentImageIndex.set(index);
  }

  nextImage(): void {
    this.currentImageIndex.update(i => (i + 1) % this.guideImages.length);
  }

  prevImage(): void {
    this.currentImageIndex.update(i => (i - 1 + this.guideImages.length) % this.guideImages.length);
  }

  // ============================================================
  // Helpers
  // ============================================================
  private formatDate(dateString: string): string {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  }

  private formatTime(dateString: string): string {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  }

  private updateDate(): void {
    this.currentDate = new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }
}
