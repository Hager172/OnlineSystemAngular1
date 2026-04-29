import { Component } from '@angular/core';
import { Approval } from '../../interfaces/approval/approval';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ReactiveFormsModule } from '@angular/forms';
import { ApprovalService } from '../../../core/services/Approval/approval-service';
import {animate, style, trigger, transition} from '@angular/animations';

@Component({
  selector: 'app-member-approval',
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './member-approval.html',
  styleUrl: './member-approval.css',
   animations: [
    trigger('fadeIn', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('300ms ease-in', style({ opacity: 1 }))
      ])
    ]),
    trigger('slideIn', [
      transition(':enter', [
        style({ transform: 'translateY(20px)', opacity: 0 }),
        animate('300ms ease-out',
          style({ transform: 'translateY(0)', opacity: 1 }))
      ])
    ])
  ]
})
export class MemberApproval {
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
  // private mockApprovals: Record<string, Approval[]> = {
  //   'M001': [
  //     {
  //       approvalNumber: 'APR-2024-001',
  //       date: 'Feb 28, 2026',
  //       expiryDate: 'Mar 15, 2026',
  //       itemCount: 3,
  //       memberId: 'M001',
  //       items: [
  //         { id: 'ITEM-001', name: 'Dell Laptop', quantity: 5, unitPrice: 120 },
  //         { id: 'ITEM-002', name: 'Office Desk', quantity: 5, unitPrice: 120 },
  //         { id: 'ITEM-003', name: 'Ergonomic Chair', quantity: 5, unitPrice: 120 }
  //       ]
  //     },
  //     {
  //       approvalNumber: 'APR-2024-002',
  //       date: 'Feb 25, 2026',
  //       expiryDate: 'Mar 10, 2026',
  //       itemCount: 2,
  //       memberId: 'M001',
  //       items: [
  //         { id: 'ITEM-004', name: 'Microsoft Office 365', quantity: 10, unitPrice:120 },
  //         { id: 'ITEM-005', name: 'Adobe Creative Cloud', quantity: 3, unitPrice: 120 }
  //       ]
  //     }
  //   ],
  //   'M002': [
  //     {
  //       approvalNumber: 'APR-2024-003',
  //       date: 'Mar 1, 2026',
  //       expiryDate: 'Mar 20, 2026',
  //       itemCount: 4,
  //       memberId: 'M002',
  //       items: [
  //         { id: 'ITEM-006', name: 'Leadership Training', quantity: 2, unitPrice: 120 },
  //         { id: 'ITEM-007', name: 'Technical Certification', quantity: 3, unitPrice: 120 },
  //         { id: 'ITEM-008', name: 'Soft Skills Workshop', quantity: 5, unitPrice: 120 },
  //         { id: 'ITEM-009', name: 'Industry Conference Pass', quantity: 2, unitPrice: 120 }
  //       ]
  //     }
  //   ]
  // };

  // private mockApprovalsById: Record<string, Approval> = {};

  constructor(private approvalService:ApprovalService) {
    // Object.values(this.mockApprovals).flat().forEach(approval => {
    //   this.mockApprovalsById[approval.approvalNumber] = approval;
    // });

  }

  // searchById(searchId?: string): void {
  //   const value = searchId || this.searchValue.trim();
  //   if (!value) return;

  //   if (value.startsWith('APR')) {
  //     const approval = this.mockApprovalsById[value];
  //     if (approval) {
  //       this.searchType = 'approval';
  //       this.currentApproval = approval;
  //       this.showResults = true;
  //     } else {
  //       alert(`No approval found with ID: ${value}`);
  //     }
  //   } else {
  //     const approvals = this.mockApprovals[value] || [];
  //     this.searchType = 'member';
  //     this.currentMemberId = value;
  //     this.memberApprovals = approvals;
  //     this.showResults = true;
  //   }
  // }
// searchById(): void {
//   const value = this.searchValue.trim();
//   if (!value) return;

//   this.approvalService.getMemberApprovals(value).subscribe({
//     next: (res) => {
//       if (res.success && res.data) {

//         this.searchType = 'member';
//         this.currentMemberId = res.data.memberId;

//         // 👇 هنا المكان الصح للـ mapping
//         this.memberApprovals = res.data.approvals.map((a: any) => ({
//           approvalNumber: a.approvalNumber.toString(),
//           date: new Date(a.approvalDate).toLocaleDateString(),
//           expiryDate: a.expiryDate
//             ? new Date(a.expiryDate).toLocaleDateString()
//             : '',
//           notes: a.notes,
//           itemCount: a.itemCount,
//           items: a.items?.map((i: any) => ({
//             id: i.id,
//             name: i.description,
//             quantity: i.quantity,
//             unitPrice: i.unitPrice
//           })) || []
//         }));

//         this.showResults = true;

//       } else {
//         alert('No approvals found');
//       }
//     },
//     error: (err) => {
//       console.error(err);
//       alert('Error fetching approvals');
//     }
//   });
// }

 searchById(searchId?: string): void {

  const value = (searchId || this.searchValue).trim();
  if (!value) return;

  if (value.startsWith('APR')) {

    this.approvalService.getMemberApprovals(value).subscribe({
      next: (res) => {
        if (res.success && res.data) {

          this.searchType = 'approval';

          this.currentApproval = this.mapSingleApproval(res.data);

          this.showResults = true;
        } else {
          alert('Approval not found');
        }
      }
    });

  } else {

    // غير كده يبقى Member ID
    this.approvalService.getMemberApprovals(value).subscribe({
      next: (res) => {
        if (res.success && res.data) {

          this.searchType = 'member';
          this.currentMemberId = res.data.memberId;

          this.memberApprovals = res.data.approvals.map((a: any) =>
            this.mapSingleApproval(a)
          );

          this.showResults = true;
          this.searchType = 'member';
          this.currentMemberId = res.data.memberId;

          this.memberApprovals = res.data.approvals.map((a: any) =>
            this.mapSingleApproval(a)
          );

          this.showResults = true;

        } else {
          alert('No approvals found');
        }
      }
    });
  }
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
