import { Component } from '@angular/core';
import { Approval } from '../../interfaces/approval/approval';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ReactiveFormsModule } from '@angular/forms';
@Component({
  selector: 'app-test',
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './test.html',
  styleUrl: './test.css',
})
export class Test {
 searchValue: string = '';
  searchType: 'member' | 'approval' | null = null;
  currentMemberId: string = '';
  currentApproval: Approval | null = null;
  memberApprovals: Approval[] = [];
  selectedApproval: Approval | null = null;
  isViewOpen: boolean = false;
  isAddOpen: boolean = false;
  showResults: boolean = false;

  // New approval form
  newApproval = {
    title: '',
    description: '',
    expiryDate: '',
    items: [{ name: '', quantity: 1, price: '' }]
  };

  // Mock data
  private mockApprovals: Record<string, Approval[]> = {
    'M001': [
      {
        approvalNumber: 'APR-2024-001',
        date: 'Feb 28, 2026',
        expiryDate: 'Mar 15, 2026',
        itemCount: 3,
        memberId: 'M001',
        items: [
          { id: 'ITEM-001', name: 'Dell Laptop', quantity: 5, unitPrice: 120 },
          { id: 'ITEM-002', name: 'Office Desk', quantity: 5, unitPrice: 120 },
          { id: 'ITEM-003', name: 'Ergonomic Chair', quantity: 5, unitPrice: 120 }
        ]
      },
      {
        approvalNumber: 'APR-2024-002',
        date: 'Feb 25, 2026',
        expiryDate: 'Mar 10, 2026',
        itemCount: 2,
        memberId: 'M001',
        items: [
          { id: 'ITEM-004', name: 'Microsoft Office 365', quantity: 10, unitPrice:120 },
          { id: 'ITEM-005', name: 'Adobe Creative Cloud', quantity: 3, unitPrice: 120 }
        ]
      }
    ],
    'M002': [
      {
        approvalNumber: 'APR-2024-003',
        date: 'Mar 1, 2026',
        expiryDate: 'Mar 20, 2026',
        itemCount: 4,
        memberId: 'M002',
        items: [
          { id: 'ITEM-006', name: 'Leadership Training', quantity: 2, unitPrice: 120 },
          { id: 'ITEM-007', name: 'Technical Certification', quantity: 3, unitPrice: 120 },
          { id: 'ITEM-008', name: 'Soft Skills Workshop', quantity: 5, unitPrice: 120 },
          { id: 'ITEM-009', name: 'Industry Conference Pass', quantity: 2, unitPrice: 120 }
        ]
      }
    ]
  };

  private mockApprovalsById: Record<string, Approval> = {};

  constructor() {
    // Build approval lookup by ID
    Object.values(this.mockApprovals).flat().forEach(approval => {
      this.mockApprovalsById[approval.approvalNumber] = approval;
    });
  }

  searchById(searchId?: string): void {
    const value = searchId || this.searchValue.trim();
    if (!value) return;

    if (value.startsWith('APR')) {
      const approval = this.mockApprovalsById[value];
      if (approval) {
        this.searchType = 'approval';
        this.currentApproval = approval;
        this.showResults = true;
      } else {
        alert(`No approval found with ID: ${value}`);
      }
    } else {
      const approvals = this.mockApprovals[value] || [];
      this.searchType = 'member';
      this.currentMemberId = value;
      this.memberApprovals = approvals;
      this.showResults = true;
    }
  }

  openView(approval: Approval): void {
    this.selectedApproval = approval;
    this.isViewOpen = true;
  }

  closeView(): void {
    this.isViewOpen = false;
    this.selectedApproval = null;
  }

  openAddDialog(): void {
    this.isAddOpen = true;
  }

  closeAddDialog(): void {
    this.isAddOpen = false;
    this.resetForm();
  }

  resetForm(): void {
    this.newApproval = {
      title: '',
      description: '',
      expiryDate: '',
      items: [{ name: '', quantity: 1, price: '' }]
    };
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
    alert('Approval confirmed - The approval process will continue.');
  }

  handleCancel(): void {
    this.showResults = false;
    this.searchType = null;
    this.currentApproval = null;
  }
//   addNewApproval(): void {
//   const newApproval: Approval = {
//     approvalNumber: `APR-${Date.now()}`,   // ✔ backticks
//     approvalDate: new Date().toLocaleDateString('en-US', {
//       year: 'numeric',
//       month: 'short',
//       day: 'numeric'
//     }),
//     expiryDate: this.newApproval.expiryDate,
//     itemCount: this.newApproval.items.length,
//     items: this.newApproval.items.map((item, i) => ({
//       id: `ITEM-${Date.now()}-${i}`,       // ✔ backticks
//       name: item.name,
//   quantity: item.quantity,
//   quantityUnit: item.quantity,
//   unitPrice: item.price
//     })),
//     memberId: this.currentMemberId
//   };

//   this.memberApprovals = [newApproval, ...this.memberApprovals];
//   this.closeAddDialog();
//   alert('Approval created successfully!');
// }


} 