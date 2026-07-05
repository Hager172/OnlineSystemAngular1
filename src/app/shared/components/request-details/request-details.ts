// import { Component, signal } from '@angular/core';
// import { CommonModule } from '@angular/common';
// import { FormsModule } from '@angular/forms';
// import { Subject } from 'rxjs';
// import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
// import { MemberService } from '../../../core/services/member/member-service';
// //import { MemberSearchResult } from '../../models/member-search.model';

// @Component({
//   selector: 'app-request-details',
//   standalone: true,
//   imports: [CommonModule, FormsModule],
//   templateUrl: './request-details.html',
//   styleUrl: './request-details.css',
// })
// export class RequestDetails {
//   constructor(private memberService: MemberService) {}

//   searchTerm: string = '';
//   search$ = new Subject<string>();

//   //member = signal<MemberSearchResult | null>(null);
//   loading = signal<boolean>(false);

//   ngOnInit(): void {
//     this.search$
//       .pipe(debounceTime(400), distinctUntilChanged())
//       .subscribe((term) => {
//         if (!term || term.length < 2) {
//       //    this.member.set(null);
//           return;
//         }
//         this.fetchMember(term);
//       });
//   }

//   onSearchInput(): void {
//     this.search$.next(this.searchTerm);
//   }

//   private fetchMember(term: string): void {
//     this.loading.set(true);

//     // ⚠️ اسم الدالة placeholder - غيريه لو الباك اند سماها حاجة تانية
//   //   this.memberService.searchMember(term).subscribe({
//   //     next: (res: MemberSearchResult) => {
//   //       this.member.set(res);
//   //       this.loading.set(false);
//   //     },
//   //     error: () => {
//   //       this.member.set(null);
//   //       this.loading.set(false);
//   //     },
//   //   });
//   // }

//   // clearSelection(): void {
//   //   this.member.set(null);
//   //   this.searchTerm = '';
//   // }
// }
// }

//  
import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgSelectComponent, NgSelectModule } from '@ng-select/ng-select';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { ApprovalService } from '../../../core/services/Approval/approval-service';
import { VendorService } from '../../../core/services/vendor/vendor-service';
import { MemberSearchResult } from '../../models/member-search';

@Component({
  selector: 'app-request-details',
  standalone: true,
  imports: [CommonModule, FormsModule, NgSelectComponent, NgSelectModule],
  templateUrl: './request-details.html',
  styleUrl: './request-details.css',
})
export class RequestDetails implements OnInit {
  constructor(
    private approvalService: ApprovalService,
    private vendorService: VendorService
  ) {}

  // =========================
  // 1. SELECT MEMBER
  // =========================
  searchTerm: string = '';
  loading = signal<boolean>(false);
  member = signal<MemberSearchResult | null>(null);

  private search$ = new Subject<string>();

  // =========================
  // 2. SELECT TYPE
  // =========================
  selectedType = signal<'Surgery' | 'Medicine' | 'Other' | null>(null);

  // =========================
  // 3. SELECT VENDOR
  // =========================
  vendorSearch$ = new Subject<string>();
  vendorOptions: any[] = [];
  selectedVendor = signal<any>(null);

  // =========================
  // 4. SELECT BRANCH (اختياري)
  // =========================
  branchOptions: any[] = [];
  selectedBranch = signal<any>(null);

  // =========================
  // INIT
  // =========================
  ngOnInit(): void {
    // بحث تلقائي عن العضو بعد ما اليوزر يوقف عن الكتابة بـ 400ms
    this.search$
      .pipe(debounceTime(400), distinctUntilChanged())
      .subscribe((term) => this.doSearch(term));

    // بحث تلقائي عن الـ Vendor
    this.vendorSearch$
      .pipe(debounceTime(400), distinctUntilChanged())
      .subscribe((term) => {
        if (!term || term.length < 2 || !this.selectedType()) {
          this.vendorOptions = [];
          return;
        }
        this.vendorService
          .filterVendorsMenu(this.selectedType()!, term)
          .subscribe({
            next: (res: any) => (this.vendorOptions = res?.data ?? res ?? []),
            error: () => (this.vendorOptions = []),
          });
      });
  }

  // =========================
  // MEMBER SEARCH
  // =========================
  onInputChange(): void {
    const value = this.searchTerm.trim();
    if (!value) {
      this.member.set(null);
      return;
    }
    this.search$.next(value);
  }

  onSearchClick(): void {
    const value = this.searchTerm.trim();
    if (!value) return;
    this.doSearch(value);
  }

  private doSearch(value: string): void {
    this.loading.set(true);

    this.approvalService.getMemberInfo(value, 'ph').subscribe({
      next: (res: any) => {
        this.loading.set(false);

        if (!res) {
          this.member.set(null);
          return;
        }

        this.member.set({
          memberId: res.memberId || value,
          memberName: res.memberName,
          customerName: res.customerName,
          mobile: res.mobile,
          cardImageUrl: res.cardImageUrl,
          nationalId: res.memberNationalId,
          birthDate: res.birthDate,
          status: res.memberStatus === 'A' ? 'Active' : (res.memberStatus ? 'Inactive' : undefined),
        });
      },
      error: (err) => {
        console.error('getMemberInfo failed', err);
        this.loading.set(false);
        this.member.set(null);
      },
    });
  }

  clearSelection(): void {
    this.member.set(null);
    this.searchTerm = '';
  }

  calculateAge(birthDate?: string): number | null {
    if (!birthDate) return null;
    const birth = new Date(birthDate);
    if (isNaN(birth.getTime())) return null;
    const diff = Date.now() - birth.getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
  }

  // =========================
  // TYPE SELECT
  // =========================
selectType(type: 'Surgery' | 'Medicine' | 'Other'): void {

  this.selectedType.set(type);

  this.selectedVendor.set(null);
  this.selectedBranch.set(null);

  this.vendorOptions = [];
  this.branchOptions = [];

}

  // =========================
  // VENDOR SELECT
  // =========================
onVendorSearch(term: string): void {

  if (!term) {
    this.vendorOptions = [];
    return;
  }

  this.vendorSearch$.next(term);

}

 onVendorSelect(vendor: any): void {

  this.selectedVendor.set(vendor);

  this.branchOptions = [];
  this.selectedBranch.set(null);

  if (!vendor) return;

  const vendorId = vendor.vendorId;

  this.vendorService.getVendorBranches(vendorId).subscribe({
    next: (res: any) => {
      this.branchOptions = res?.data ?? res ?? [];
    },
    error: () => {
      this.branchOptions = [];
    }
  });

}

  onVendorClear(): void {
    this.selectedVendor.set(null);
    this.vendorOptions = [];
    this.branchOptions = [];
    this.selectedBranch.set(null);
  }
}