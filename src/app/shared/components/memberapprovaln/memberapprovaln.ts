import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Approval } from '../../interfaces/approval/approval';
import { ApprovalService } from '../../../core/services/Approval/approval-service';
import { Router, RouterModule } from '@angular/router';
import { ChangeDetectorRef } from '@angular/core';
interface Client {
  id: string;
  name: string;
  icon: string;
  color: string;
}

interface WorkItem {
  id: string;
  memberId: string;
  requestType: string;
  submittedTime: string;
  submittedDate: string;
  status: 'approved' | 'pending';
  client: string;
}

@Component({
  selector: 'app-memberapprovaln',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './memberapprovaln.html',
  styleUrls: ['./memberapprovaln.css']
})
export class Memberapprovaln implements OnInit {
Math = Math;
memberApprovals: Approval[] = [];
currentApproval = signal<Approval | null>(null);
showResults = signal(false);
searchType: 'member' | 'approval' | null = null;
currentMemberId: string = '';
selectedApproval: Approval | null = null;
isViewOpen: boolean = false;
isAddOpen: boolean = false;

selectedClient: string = 'client1';
lookupType: 'memberId' | 'approvalId' = 'memberId';
lookupValue: string = '';
activeTab: 'approved' | 'pending' = 'pending';
searchQuery: string = '';
currentPage: number = 1;
itemsPerPage: number = 5;
currentDate: string = '';
activeManualSection: string | null = null;
currentImageIndex: number = 0;
error: string = '';
constructor(private approvalService: ApprovalService, private router: Router, private cdr: ChangeDetectorRef){}
  // clients: Client[] = [
  //   { id: 'client1', name: 'Acme Corporation', icon: 'building', color: 'blue' },
  //   { id: 'client2', name: 'Global Industries', icon: 'briefcase', color: 'green' },
  //   { id: 'client3', name: 'Tech Solutions Inc', icon: 'cpu', color: 'purple' },
  //   { id: 'client4', name: 'Healthcare Partners', icon: 'heart', color: 'red' },
  //   { id: 'client5', name: 'Financial Services Ltd', icon: 'dollar', color: 'orange' }
  // ];

  mockData: { [key: string]: { pending: WorkItem[], approved: WorkItem[] } } = {
    client1: {
      pending: [
        { id: 'PND-003', memberId: 'M-12350', requestType: 'Appeal Request', submittedTime: '01:15 PM', submittedDate: '2/19/2026', status: 'pending', client: 'Acme Corporation' }
      ],
      approved: [
        { id: 'APR-001', memberId: 'M-12345', requestType: 'Claim Approval', submittedTime: '08:30 AM', submittedDate: '2/19/2026', status: 'approved', client: 'Acme Corporation' }
      ]
    },
    client2: {
      pending: [
        { id: 'PND-004', memberId: 'M-12351', requestType: 'Coverage Verification', submittedTime: '02:00 PM', submittedDate: '2/19/2026', status: 'pending', client: 'Global Industries' }
      ],
      approved: [
        { id: 'APR-002', memberId: 'M-12346', requestType: 'Policy Update', submittedTime: '09:15 AM', submittedDate: '2/19/2026', status: 'approved', client: 'Global Industries' }
      ]
    }
  };

  manualItems = [
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

  ngOnInit(): void {
    this.updateDate();
  }
onDisplayApproval(): void {

  const approvalNumber = this.lookupValue?.trim();

  if (!approvalNumber) {
    alert('Please enter approval number');
    return;
  }

  if (!this.approvalService.approvalExists(approvalNumber)) {
    this.error = `Approval ${approvalNumber} not found. Try: APR-001, APR-002, or APR-003`;
    return;
  }

  this.router.navigate(['/approval-edit', approvalNumber]);
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

  selectClient(clientId: string): void {
    this.selectedClient = clientId;
    this.currentPage = 1;
  }

selectLookupType(type: 'memberId' | 'approvalId'): void {
  this.lookupType = type;

  // reset input
  this.lookupValue = '';

  // reset results
  this.showResults.set(false);
  this.searchType = null;

  // reset approval
  this.currentApproval.set(null);

  // reset member approvals
  this.memberApprovals = [];
  this.currentMemberId = '';

  // reset errors
  this.error = '';
}
handleLookup(): void {
  const value = (this.lookupValue || '').trim();
  if (!value) return;

  if (this.lookupType === 'approvalId') {
    this.approvalService.getApprovalDetails(value).subscribe({
      next: (res) => {
        this.searchType = 'approval';
        this.currentApproval.set(this.mapApprovalDetails(res));
        this.showResults.set(true);
      },
      error: () => {
        alert('Approval not found');
        this.showResults.set(false);
      }
    });
  } else if (this.lookupType === 'memberId') {
    this.approvalService.getMemberApprovals(value).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.searchType = 'member';
          this.currentMemberId = res.data.memberId;
          this.memberApprovals = res.data.approvals.map((a: any) =>
            this.mapSingleApproval(a)
          );
          this.showResults.set(true);
        } else {
          alert('No approvals found');
          this.showResults.set(false);
        }
      },
      error: () => {
        alert('No approvals found');
        this.showResults.set(false);
      }
    });
  }
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
  openView(approval: Approval): void {
    this.selectedApproval = approval;
    this.isViewOpen = true;
  }

  switchTab(tab: 'approved' | 'pending'): void {
    this.activeTab = tab;
    this.currentPage = 1;
  }

  get currentItems(): WorkItem[] {
    const clientData = this.mockData[this.selectedClient] || { pending: [], approved: [] };
    const items = this.activeTab === 'pending' ? clientData.pending : clientData.approved;
    
    const filtered = items.filter(item => {
      if (!this.searchQuery) return true;
      const query = this.searchQuery.toLowerCase();
      return item.id.toLowerCase().includes(query) ||
             item.memberId.toLowerCase().includes(query) ||
             item.requestType.toLowerCase().includes(query) ||
             item.client.toLowerCase().includes(query);
    });

    const start = (this.currentPage - 1) * this.itemsPerPage;
    return filtered.slice(start, start + this.itemsPerPage);
  }

  get totalPages(): number {
    const clientData = this.mockData[this.selectedClient] || { pending: [], approved: [] };
    const items = this.activeTab === 'pending' ? clientData.pending : clientData.approved;
    
    const filtered = items.filter(item => {
      if (!this.searchQuery) return true;
      const query = this.searchQuery.toLowerCase();
      return item.id.toLowerCase().includes(query) ||
             item.memberId.toLowerCase().includes(query) ||
             item.requestType.toLowerCase().includes(query) ||
             item.client.toLowerCase().includes(query);
    });

    return Math.ceil(filtered.length / this.itemsPerPage);
  }

  get pendingCount(): number {
    const clientData = this.mockData[this.selectedClient] || { pending: [], approved: [] };
    return clientData.pending.length;
  }

  get approvedCount(): number {
    const clientData = this.mockData[this.selectedClient] || { pending: [], approved: [] };
    return clientData.approved.length;
  }

  changePage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
    }
  }

  handleAction(action: string, id: string): void {
    alert(`${action.charAt(0).toUpperCase() + action.slice(1)} action for ${id}`);
  }

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

  getPagesArray(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
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
    items: a.items?.map((i: any) => ({
      id: i.id,
      name: i.description,
      quantity: i.quantity,
      unitPrice: i.unitPrice
    })) || []
  };
  }
}
