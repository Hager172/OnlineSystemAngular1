import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { ApprovalService } from '../../../core/services/Approval/approval-service';
import { AuthService } from '../../../core/services/auth/auth-service';
import { MemberService } from '../../../core/services/member/member-service';

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
// بدل الـ boolean العادي
isModalOpen = signal(false);
  currentMemberId: string = '';
  memberApprovals: Approval[] = [];
  currentApproval = signal<Approval | null>(null);
  
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
    private memberService: MemberService
  ) {}

  ngOnInit(): void {
    this.updateDate();
    this.getVendorId();
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
    this.error.set('');
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

    if (res.success && res.data) {

      this.searchType = 'member';
      this.currentMemberId = res.data.memberId;

      this.memberApprovals = res.data.approvals.map((a: any) =>
        this.mapSingleApproval(a)
      );

      this.error.set('');
      this.showResults.set(true);
      this.isLoading.set(false);

    } else {

      this.error.set(res.message || 'No approvals found');
      this.showResults.set(false);
      this.isLoading.set(false);
      this.isModalOpen.set(true);
    }
  },
  error: (err) => {
    console.log("error", err);

    this.error.set(err?.error?.message ||
      'Something went wrong');

    this.isLoading.set(false);

    this.showResults.set(false);

    if(err.error.message == 'No approvals found'){
      this.isModalOpen.set(true);
    }
  }
}); }
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
      expiryDate: a.expiryDate
        ? new Date(a.expiryDate).toLocaleDateString()
        : '',
      notes: a.notes,
      itemCount: a.itemCount,
      memberTele: a.memberTele || 'N/A',
      items: a.items?.map((i: any) => ({
        id: i.id,
        name: i.description,
        quantity: i.quantity,
        unitPrice: i.unitPrice
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

    onNewApproval(): void {
    this.isModalOpen.set(false);
    alert('Create new approval functionality - coming soon!');
  }
  
    closeModal(): void {
    this.isModalOpen.set(false);
  }



goToAddApproval() {
  // 1. جهز الأوبجكت اللي عايز تنقله (ممكن تبعت الأوبجكت اللي راجعلك من الـ API كله)
  const dataToSave = {
    memberId: this.currentMemberId,
    approvals: this.memberApprovals // المصفوفة اللي فيها رقم التليفون
  };

  // 2. خزن الداتا في السيرفيس
  this.memberService.setMemberData(dataToSave);

  // 3. روح لصفحة الإضافة
  this.router.navigate(['/add']);
}
}