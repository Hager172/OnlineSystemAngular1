import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { ApprovalService } from '../../../core/services/Approval/approval-service';
import { AuthService } from '../../../core/services/auth/auth-service';
import { MemberService } from '../../../core/services/member/member-service';
import { MatSnackBar } from '@angular/material/snack-bar';
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
  memberTele: string;
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
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './memberapprovaln.html',
  styleUrls: ['./memberapprovaln.css']
})
export class Memberapprovaln implements OnInit {
  
pendingApprovals = signal<ApprovalItem[]>([]);
approvedApprovals = signal<ApprovalItem[]>([]);
  isLoading = signal<boolean>(false);
  lookupType: 'memberId' | 'approvalId' = 'memberId';
  lookupValue: string = '';
  showResults = signal(false);
  searchType: 'member' | 'approval' | null = null;
  currentApproval = signal<Approval | null>(null);
  currentMemberId: string = '';
  memberApprovals: Approval[] = [];
  selectedApproval: Approval | null = null;
  /** Keeps the last viewed approval rendered while the panel animates closed. */
  displayedApproval: Approval | null = null;
  detailsLoading = signal(false);
  /** Member profile (name, mobile, ...) for the results strip. */
  member = signal<any>(null);
  
  // هنا التعديل - خليها 'approved' عشان يبقى هو default
  activeTab: 'pending' | 'approved' = 'pending';  // ✅改了这里
  
  searchQuery: string = '';
  
  currentPage: number = 1;
  itemsPerPage: number = 5;
  currentDate: string = '';
  
  clientid: string = '';
  vendorid: string = '';
  Math = Math;
  error= signal<string>('');
  roleLabel: string = 'User';

  private readonly roleLabels: Record<string, string> = {
    HEADOFFICE: 'Head Office',
    CLINETAGENT: 'Client Agent',
    SITEAGENT: 'Site Agent',
  };

  // User Manual Data
  manualItems: ManualItem[] = [
    { id: 'quick-guide', title: 'Quick Guide', description: 'Learn the basics of using the approval system' },
    { id: 'video', title: 'Video Tutorials', description: 'Watch step-by-step video instructions' },
    { id: 'faqs', title: 'FAQs', description: 'Find answers to commonly asked questions' },
    { id: 'docs', title: 'Complete Documentation', description: 'Access the full user manual and documentation' }
  ];

  guideImages: string[] = [
    'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&q=80',
    'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&q=80',
    'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800&q=80'
  ];

  activeManualSection: string | null = null;
  currentImageIndex: number = 0;

  constructor(
    private approvalService: ApprovalService,
    private router: Router,
    private authService: AuthService,
    private memberService: MemberService,
     private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.updateDate();
    this.getVendorId();

    this.authService.role$.subscribe((role: string | null) => {
      const key = (role || '').toUpperCase();
      this.roleLabel = this.roleLabels[key] || role || 'User';
    });
    // this.activeTab = 'pending';
       

  }

  getVendorId(): void {
    const clientid = this.authService.getclientid();
    const vendorid=this.authService.getVendorId();
    if (clientid) {
      this.clientid = clientid;
      console.log("client", clientid);
     if(vendorid){
      this.vendorid=vendorid;
            console.log("vendorid", vendorid);

     }
     
    this.switchTab('approved');
    } else {
      this.error.set('Vendor ID not found');
      console.log("vendor not found");
    }
  }

  loadData(): void {
    this.loadPendingApprovals();
    this.loadApprovedApprovals();
  }

loadPendingApprovals(): void {
  this.approvalService.getTodayNotCompletedApprovals(this.clientid, this.vendorid).subscribe({
    next: (response) => {
      const dataArray = Array.isArray(response.data.approvals) ? response.data.approvals : [];
      
      // ✅ استخدم .set() لتحديث الـ Signal
      this.pendingApprovals.set(dataArray.map((item: any) => ({
        id: item.id || item.approvalId,
        memberId: item.memberid,
        memberName: item.membername,
        requestType: item.apptype || 'General Request',
        client: item.membername,
        submittedDate: this.formatDate(item.approval_date),
        submittedTime: this.formatTime(item.approval_date),
        status: 'pending',
        note: item.note
      })));

      if (this.activeTab === 'pending') {
        this.currentPage = 1;
      }
    }
  });
}

loadApprovedApprovals(): void {
  this.approvalService.getTodayCompletedApprovals(this.clientid, this.vendorid).subscribe({
    next: (response) => {
      const dataArray = Array.isArray(response.data?.approvals) ? response.data.approvals : [];
      
      // ✅ استخدم .set() لتحديث الـ Signal
      this.approvedApprovals.set(dataArray.map((item: any) => ({
        id: item.id || item.approvalId,
        memberId: item.memberid,
        memberName: item.membername,
        requestType: item.apptype || 'General Request',
        client: item.membername,
        submittedDate: this.formatDate(item.approval_date),
        submittedTime: this.formatTime(item.approval_date),
        status: 'approved',
        note: item.note
      })));

      if (this.activeTab === 'approved') {
        this.currentPage = 1;
      }
    },
    error: (err) => {
      this.approvedApprovals.set([]); // ✅ تحديث صحيح في حالة الخطأ
    }
  });
}

  formatDate(dateString: string): string {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  formatTime(dateString: string): string {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  updateDate(): void {
    const date = new Date();
    const options: Intl.DateTimeFormatOptions = { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    };
    this.currentDate = date.toLocaleDateString('en-US', options);
  }

  selectLookupType(type: 'memberId' | 'approvalId'): void {
    this.lookupType = type;
    this.lookupValue = '';
    this.showResults.set(false);
    this.searchType = null;
    this.currentApproval.set(null);
    this.memberApprovals = [];
    this.currentMemberId = '';
    this.selectedApproval = null;
    this.displayedApproval = null;
    this.member.set(null);
    this.error.set('');
  }

  /** Toggles the inline details panel for an approval row. */
  selectApproval(approval: Approval): void {
    if (this.selectedApproval === approval) {
      // collapse with animation — displayedApproval stays so the content
      // is still visible while the panel slides shut
      this.selectedApproval = null;
      return;
    }
    this.selectedApproval = approval;
    this.displayedApproval = approval;
    // the member-approvals list comes without items → fetch them on first view
    if (!approval.items?.length) {
      this.loadApprovalServices(approval);
    }
  }

  /** Fetches the services of an approval (same endpoint the pull page uses). */
  private loadApprovalServices(approval: Approval): void {
    this.detailsLoading.set(true);
    this.approvalService.getApprovalDetails(approval.approvalNumber).subscribe({
      next: (res: any) => {
        approval.items =
          res.services?.map((s: any) => ({
            id: s.serviceId,
            name: s.itemDesc || s.servicename,
            quantity: s.apQty,
            unitPrice: s.price
          })) || [];
        approval.itemCount = approval.items.length;
        if (!approval.notes && res.notes) {
          approval.notes = res.notes;
        }
        if ((!approval.memberTele || approval.memberTele === 'N/A') && res.memberTele) {
          approval.memberTele = res.memberTele;
        }
        this.detailsLoading.set(false);
      },
      error: (err) => {
        console.log('error loading approval services', err);
        this.detailsLoading.set(false);
      }
    });
  }

  /** Back from the results view → restore the default dashboard cards. */
  closeResults(): void {
    this.showResults.set(false);
    this.searchType = null;
    this.currentApproval.set(null);
    this.memberApprovals = [];
    this.currentMemberId = '';
    this.selectedApproval = null;
    this.displayedApproval = null;
    this.member.set(null);
    this.lookupValue = '';
    this.error.set('');
  }

  /** Scrolls to the worklist card (optionally switching to the pending tab first). */
  scrollToWorklist(switchToPending = false): void {
    if (switchToPending) {
      this.switchTab('pending');
    }
    setTimeout(() =>
      document.querySelector('.queue-card')?.scrollIntoView({ behavior: 'smooth' })
    );
  }

  /** Subtotal of an approval's items (qty × unit price). */
  getApprovalSubtotal(approval: Approval | null): number {
    if (!approval?.items) return 0;
    return approval.items.reduce(
      (sum: number, item: any) => sum + ((Number(item.quantity) || 0) * (Number(item.unitPrice) || 0)),
      0
    );
  }

  handleLookup(): void {
          this.error.set('');

    const value = (this.lookupValue || '').trim();
    if (!value) return;
this.isLoading.set(true);
    if (this.lookupType === 'approvalId') {
      this.approvalService.getApprovalDetails(value).subscribe({
        next: (res: any) => {
          this.searchType = 'approval';
          this.currentApproval.set(this.mapApprovalDetails(res));
          this.showResults.set(true);
          this.isLoading.set(false);
        },
        error: (err) => {
          console.log("error elsearch", err);
          this.error.set('Approval not found');
          
          this.showResults.set(false);
          this.isLoading.set(false);
        }
      });
    } else if (this.lookupType === 'memberId') {
  this.approvalService.getMemberApprovals(value).subscribe({
    next: (res: any) => {
      console.log("mem", res);
      this.isLoading.set(false);
      const approvals = Array.isArray(res?.data?.approvals) ? res.data.approvals : [];

      if (res.success && res.data && approvals.length > 0) {
        // approvals exist → show them here and hide the dashboard cards
        this.searchType = 'member';
        this.currentMemberId = (res.data.memberId ?? value).toString();
        this.memberService.setMemberData(res.data);
        this.memberApprovals = approvals.map((a: any) => this.mapSingleApproval(a));
        this.selectedApproval = null;
        this.error.set('');
        this.showResults.set(true);
        this.loadMemberInfo(this.currentMemberId);
      } else if (res.success && res.data) {
        // valid member with NO approvals → straight to Claim Issuing
        this.goToClaimIssuing(value);
      } else if ((res.message || '').toLowerCase().includes('no approvals')) {
        this.goToClaimIssuing(value);
      } else {
        this.error.set(res.message || 'The Member ID you entered is not valid or does not exist.');
        this.showResults.set(false);
      }
    },
  error: (err) => {
  this.isLoading.set(false);
  this.showResults.set(false);
console.log("error elsearch", err);
 if (err.error?.message === 'No approvals found') {
    // valid member with NO approvals → straight to Claim Issuing
    this.goToClaimIssuing(value);
    return;
  }

  this.error.set(err?.error?.message || 'Something went wrong');
}
  });
}
  }

  /** Loads the member profile (name, mobile, photo) for the results strip. */
  private loadMemberInfo(memberId: string): void {
    this.member.set(null);
    const vendorType = this.authService.getVendorType();
    this.approvalService.getMemberInfo(memberId, vendorType ?? '').subscribe({
      next: (res) => this.member.set(res),
      error: (err) => {
        console.log('error loading member info', err);
        this.member.set(null);
      }
    });
  }

  /** Mobile shown in the strip — from the approvals, else the member profile. */
  get memberMobile(): string {
    const tele = this.memberApprovals[0]?.memberTele;
    if (tele && tele !== 'N/A') return tele;
    return this.member()?.mobile || 'N/A';
  }

  /** Member has no approvals → open the Claim Issuing (add) page directly. */
  private goToClaimIssuing(memberId: string): void {
    this.error.set('');
    this.memberService.setMemberData({ memberId });
    this.router.navigate(['/add'], {
      queryParams: { memberId, noApprovals: 1 }
    });
  }

  private mapSingleApproval(a: any): Approval {
    return {
      approvalNumber: a.approvalNumber?.toString(),
      memberId: a.memberId,
      date: a.approvalDate ? new Date(a.approvalDate).toLocaleDateString() : '',
      expiryDate: a.expiryDate
        ? new Date(a.expiryDate).toLocaleDateString()
        : '',
      notes: a.notes,
      itemCount: a.itemCount ?? a.items?.length ?? 0,
      memberTele: a.memberTele || 'N/A',
      items: a.items?.map((i: any) => ({
        id: i.id,
        name: i.description ?? i.name,
        quantity: i.quantity,
        unitPrice: i.unitPrice
      })) || []
    };
  }

  /** "Claim Issuing" from the results view → new claim for this member. */
  goToAddApproval(): void {
    this.router.navigate(['/add'], {
      queryParams: { memberId: this.currentMemberId }
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
      memberTele: a.memberTele || 'N/A',
      items: a.services?.map((s: any) => ({
        id: s.serviceId,
        name: s.itemDesc || s.servicename,
        quantity: s.apQty,
        unitPrice: s.price
      })) || []
    };
  }

switchTab(tab: 'pending' | 'approved'): void {
  this.activeTab = tab;
  this.currentPage = 1;
  this.searchQuery = '';

  if (tab === 'pending') {
    this.loadPendingApprovals();
  } else {
    this.loadApprovedApprovals();
  }
}

get currentItems(): ApprovalItem[] {
  const sourceItems = this.activeTab === 'pending' ? this.pendingApprovals() : this.approvedApprovals();
  
  console.log("Current Source Items:", sourceItems); // كدة هيطبع الداتا صح

  let filtered = sourceItems;
  
  if (this.searchQuery) {
    const query = this.searchQuery.toLowerCase();
    filtered = sourceItems.filter(item => 
      item.id?.toString().includes(query) ||
      item.memberId?.toLowerCase().includes(query) ||
      item.memberName?.toLowerCase().includes(query)
    );
  }
  
  const start = (this.currentPage - 1) * this.itemsPerPage;
  return filtered.slice(start, start + this.itemsPerPage);
}

 get totalPages(): number {
  const sourceItems = this.activeTab === 'pending' ? this.pendingApprovals() : this.approvedApprovals();
  
  let filtered: ApprovalItem[] = sourceItems; 
  
  if (this.searchQuery) {
    const query = this.searchQuery.toLowerCase();
    filtered = sourceItems.filter((item: ApprovalItem) => 
      item.id?.toString().includes(query) ||
      item.memberId?.toLowerCase().includes(query) ||
      item.memberName?.toLowerCase().includes(query) ||
      item.requestType?.toLowerCase().includes(query) ||
      item.client?.toLowerCase().includes(query)
    );
  }
  
  return Math.ceil(filtered.length / this.itemsPerPage);
}

  get pendingCount(): number {
    return this.pendingApprovals.length;
  }

  get approvedCount(): number {
    return this.approvedApprovals.length;
  }

  changePage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
    }
  }

  getPagesArray(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }

  handleAction(action: string, id: number): void {
    switch(action) {
      case 'print':
        console.log('Printing approval:', id);
        break;
      case 'edit':
        this.router.navigate(['/approval-edit', id]);
        break;
      case 'delete':
        if (confirm('Are you sure you want to delete this approval?')) {
          console.log('Deleting approval:', id);
        }
        break;
    }
  }

  // User Manual Methods
  toggleManualSection(sectionId: string): void {
    this.activeManualSection = this.activeManualSection === sectionId ? null : sectionId;
    this.currentImageIndex = 0;
  }

  nextImage(): void {
    this.currentImageIndex = (this.currentImageIndex + 1) % this.guideImages.length;
  }

  prevImage(): void {
    this.currentImageIndex = (this.currentImageIndex - 1 + this.guideImages.length) % this.guideImages.length;
  }

}