

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgSelectComponent, NgSelectModule } from '@ng-select/ng-select';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { ApprovalService } from '../../../core/services/Approval/approval-service';
import { VendorService } from '../../../core/services/vendor/vendor-service';
import { RequestStateService } from '../../../core/services/request-state/request-state';
import { VendorOption, BranchOption, DiagnosisOption } from '../../models/member-search';

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
    private vendorService: VendorService,
    public state: RequestStateService
  ) {}

  // --- Member search ---
  searchTerm: string = '';
  loading = false;
  private search$ = new Subject<string>();

  // --- Vendor search ---
  vendorSearch$ = new Subject<string>();
  vendorOptions: VendorOption[] = [];
  

  // --- Branch ---
  branchOptions: BranchOption[] = [];

  // --- Diagnosis ---
  diagnosisSearch$ = new Subject<string>();
  diagnosisOptions: DiagnosisOption[] = [];

  // --- Source (placeholder) ---
  sourceOptions: string[] = ['Manual Entry', 'Call Center', 'Online Portal', 'Email'];

  ngOnInit(): void {
    this.search$
      .pipe(debounceTime(400), distinctUntilChanged())
      .subscribe((term) => this.doMemberSearch(term));

    this.vendorSearch$
      .pipe(debounceTime(400), distinctUntilChanged())
      .subscribe((term) => {
        const type = this.state.selectedType();
        if (!term || term.length < 2 || !type) {
          this.vendorOptions = [];
          return;
        }
        this.vendorService.filterVendorsMenu(type, term).subscribe({
          next: (res: any) => {
            console.log("result:", res);
            (this.vendorOptions = res?.data?.items ?? res?.data ?? res ?? [])
          },
          error: () => (this.vendorOptions = []),
        });
      });

    this.diagnosisSearch$
      .pipe(debounceTime(400), distinctUntilChanged())
      .subscribe((term) => {
        if (!term || term.length < 2) {
          this.diagnosisOptions = [];
          return;
        }
        // this.approvalService.getDiagnosis(term).subscribe({
        //   next: (res: any) => (this.diagnosisOptions = res?.data ?? res ?? []),
        //   error: () => (this.diagnosisOptions = []),
        // });
      });
  }

  // =========================
  // 1. MEMBER
  // =========================
  onMemberInputChange(): void {
    const value = this.searchTerm.trim();
    if (!value) {
      this.state.member.set(null);
      return;
    }
    this.search$.next(value);
  }

  onMemberSearchClick(): void {
    const value = this.searchTerm.trim();
    if (!value) return;
    this.doMemberSearch(value);
  }

  private doMemberSearch(value: string): void {
    this.loading = true;

    this.approvalService.getMemberInfo(value, 'ph').subscribe({
      next: (res: any) => {
        this.loading = false;
        if (!res) {
          this.state.member.set(null);
          return;
        }
        this.state.member.set({
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
        this.loading = false;
        this.state.member.set(null);
      },
    });
  }

  calculateAge(birthDate?: string): number | null {
    if (!birthDate) return null;
    const birth = new Date(birthDate);
    if (isNaN(birth.getTime())) return null;
    const diff = Date.now() - birth.getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
  }

  // =========================
  // 2. TYPE
  // =========================
  selectType(type: 'Surgical' | 'Pharmacy' | 'Public'): void {
    this.state.selectedType.set(type);
    this.state.selectedVendor.set(null);
    this.state.selectedBranch.set(null);
    this.vendorOptions = [];
    this.branchOptions = [];
  }

  // =========================
  // 3. VENDOR
  // =========================
  onVendorSearch(term: string): void {
    if (!term) {
      this.vendorOptions = [];
      return;
    }
    this.vendorSearch$.next(term);
  }
selectedVendorId!: string;

selectedVendorType!: string;

onVendorSelect(vendor: any) {
  this.selectedVendorId = vendor.id;
  this.selectedVendorType = vendor.id.substring(0, 2); // مثال: Ph

  this.state.selectedVendor.set(vendor);

  console.log("selectedVendorId:", this.selectedVendorId);
  console.log("selectedVendorType:", this.selectedVendorType);
  
}

  onVendorClear(): void {
    this.state.selectedVendor.set(null);
    this.vendorOptions = [];
    this.branchOptions = [];
    this.state.selectedBranch.set(null);
  }

  // =========================
  // DIAGNOSIS
  // =========================
  onDiagnosisSearch($event: any): void {
    const term = $event?.term;
    if (term && term.length >= 2) {
      this.diagnosisSearch$.next(term);
    } else {
      this.diagnosisOptions = [];
    }
  }

  onDiagnosisClear(): void {
    this.diagnosisOptions = [];
    this.diagnosisSearch$.next('');
  }

  // =========================
  // CONTACT METHODS
  // =========================
  toggleContactMethod(method: string): void {
    const current = new Set(this.state.selectedContactMethods());
    current.has(method) ? current.delete(method) : current.add(method);
    this.state.selectedContactMethods.set(current);
  }

  isContactMethodActive(method: string): boolean {
    return this.state.selectedContactMethods().has(method);
  }
}