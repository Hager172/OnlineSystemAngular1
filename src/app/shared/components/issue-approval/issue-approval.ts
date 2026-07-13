import { Component, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { NgSelectComponent, NgSelectModule } from '@ng-select/ng-select';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import Swal from 'sweetalert2';

import { ApprovalService } from '../../../core/services/Approval/approval-service';
import { VendorService } from '../../../core/services/vendor/vendor-service';
import { RequestStateService } from '../../../core/services/request-state/request-state';
import {
  VendorOption,
  BranchOption,
  DiagnosisOption,
  ServiceOption,
  CareItemOption,
  ServiceRow,
} from '../../models/member-search';
import {
  ServicePackageDto,
  findCoveredPackages,
} from '../../models/create-claim/service-package.model';

/**
 * Agent "Issue Approval" page — addapproval look & feel, but keeps the
 * original request-details / request-services / request-attachments logic.
 * The member must be entered and validated first before the rest shows.
 */
@Component({
  selector: 'app-issue-approval',
  standalone: true,
  imports: [CommonModule, FormsModule, NgSelectComponent, NgSelectModule, RouterModule],
  providers: [RequestStateService, ApprovalService],
  templateUrl: './issue-approval.html',
  styleUrl: './issue-approval.css',
})
export class IssueApproval {

  // =========================
  // MEMBER CHECK (step 1 gate)
  // =========================
  searchTerm: string = '';
  loadingMember = false;
  memberChecked = false;   // true after the first check attempt
  memberError = '';
  memberPhoto: string = 'assets/images/member-photo.png';

  /** أقل تاريخ مسموح — النهارده (التاريخ لا يمكن يكون أقل من اليوم) */
  minDate: string = new Date().toISOString().split('T')[0];

  // =========================
  // LOOKUPS
  // =========================
  vendorSearch$ = new Subject<string>();
  vendorOptions: VendorOption[] = [];
  branchOptions: BranchOption[] = [];

  diagnosisSearch$ = new Subject<string>();
  diagnosisOptions: DiagnosisOption[] = [];

  serviceSearch$ = new Subject<string>();
  serviceOptions: ServiceOption[] = [];
  careItemOptions: CareItemOption[] = [];

  /** Active contract-service packages, and the package ids already alerted for. */
  servicePackages: ServicePackageDto[] = [];
  private alertedPackageIds = new Set<number>();

  // =========================
  // SUBMIT STATE
  // =========================
  submitted = false;
  submitting = false;

  constructor(
    public state: RequestStateService,
    public approvalService: ApprovalService,
    private vendorService: VendorService
  ) {
    // تحميل الـ Care Items أول ما العضو يتأكد
    effect(() => {
      const member = this.state.member();
      if (!member?.memberId) {
        this.careItemOptions = [];
        return;
      }
      this.approvalService.getMemberCareItems(member.memberId).subscribe({
        next: (res: any) => {
          const data = res.data ?? res;
          this.careItemOptions = data.map((x: any) => ({
            id: x.careItemCode,
            name: x.careItemName,
          }));
        },
        error: () => {
          this.careItemOptions = [];
        },
      });
    });

    // تغيير الفيندور بيفضّي جدول الخدمات
    effect(() => {
      this.state.selectedVendor();
      this.serviceOptions = [];
      this.state.serviceRows.set([]);
    });

    // Warn when the selected services fully cover a contract-service package:
    // the approval is priced at the package price, not the sum of item prices.
    effect(() => {
      const rows = this.state.serviceRows();
      this.checkServicePackages(rows);
    });

    // Contract-service packages active today.
    this.approvalService.getServicePackages().subscribe({
      next: (res) => (this.servicePackages = res ?? []),
      error: () => (this.servicePackages = []),
    });

    this.vendorSearch$
      .pipe(debounceTime(400), distinctUntilChanged())
      .subscribe((term) => {
        const type = this.state.selectedType();
        // الفيندور بيشتغل من أول حرف واحد
        if (!term || term.length < 1 || !type) {
          this.vendorOptions = [];
          return;
        }
        this.vendorService.filterVendorsMenu(type, term).subscribe({
          next: (res: any) => (this.vendorOptions = res?.data?.items ?? res?.data ?? res ?? []),
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
        this.approvalService.getDiagnosis(term).subscribe({
          next: (res: any) => (this.diagnosisOptions = res.data ?? res ?? []),
          error: () => (this.diagnosisOptions = []),
        });
      });

    this.serviceSearch$
      .pipe(debounceTime(300), distinctUntilChanged())
      .subscribe((term) => {
        const vendor = this.state.selectedVendor();
        // الأدوية من 3 حروف — غير كده من أول حرف
        const minLen = this.isMedicineType ? 3 : 1;
        if (!vendor || !term || term.length < minLen) {
          this.serviceOptions = [];
          return;
        }
        this.approvalService.getAgentProducts(term, vendor.id).subscribe({
          next: (res: any) => {
            this.serviceOptions = res.map((x: any) => ({
              serviceId: x.id,
              serviceName: x.name,
              price: x.price,
              doseUnitNo: x.doseUnitNo,
              subUnitNo: x.subUnitNo,
              unitSale: x.unitSale,
              doseForm: x.doseForm,
            }));
          },
          error: () => {
            this.serviceOptions = [];
          },
        });
      });
  }

  // =========================
  // 1. MEMBER
  // =========================
  checkMember(): void {
    const value = this.searchTerm.trim();
    if (!value) {
      this.memberError = 'Member ID is required.';
      this.memberChecked = true;
      return;
    }

    this.loadingMember = true;
    this.memberError = '';

    this.approvalService.getMemberInfo(value, 'ph').subscribe({
      next: (res: any) => {
        this.loadingMember = false;
        this.memberChecked = true;
        if (!res || !res.memberName) {
          this.state.member.set(null);
          this.memberError = 'Member not found or not valid.';
          return;
        }
        this.memberPhoto = res.cardImageUrl || 'assets/images/member-photo.png';
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
        this.loadingMember = false;
        this.memberChecked = true;
        this.state.member.set(null);
        this.memberError = 'Member not found or not valid.';
      },
    });
  }

  changeMember(): void {
    this.state.reset();
    this.searchTerm = '';
    this.memberChecked = false;
    this.memberError = '';
    this.submitted = false;
    this.memberPhoto = 'assets/images/member-photo.png';
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

  get isMedicineType(): boolean {
    return this.state.selectedType() === 'Pharmacy';
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

  onVendorSelect(vendor: any): void {
    this.state.selectedVendor.set(vendor);
  }

  onVendorClear(): void {
    this.state.selectedVendor.set(null);
    this.vendorOptions = [];
    this.branchOptions = [];
    this.state.selectedBranch.set(null);
  }

  /** Display label for the chosen vendor (API returns id/text pairs). */
  vendorLabel(): string {
    const v: any = this.state.selectedVendor();
    return v?.vendorName || v?.text || v?.id || 'Not Selected';
  }

  // =========================
  // DIAGNOSIS
  // =========================
  onDiagnosisSearch(event: any): void {
    const term = event?.term?.trim() ?? '';
    if (term.length >= 2) {
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
  // SERVICES
  // =========================
  addServiceRow(): void {
    this.state.addEmptyServiceRow();
  }

  removeServiceRow(rowId: string): void {
    this.state.removeServiceRow(rowId);
  }

  private calculateMedicineQty(
    units: number,
    repeat: number,
    duration: number,
    doseUnitNo: number,
    subUnitNo: number
  ): number {
    const dose = doseUnitNo || 1;
    const sub = subUnitNo || 1;

    let medQty = (units * repeat * duration) / (dose / sub);
    const decimalPart = medQty % 1;
    medQty = Math.round(medQty);

    if (decimalPart >= 0.3 && decimalPart < 0.5) {
      medQty += 1;
    }

    return medQty;
  }

  private calculateMedicinePrice(rawPrice: number, subUnitNo?: number): number {
    return rawPrice / (subUnitNo || 1);
  }

  onServiceSelect(row: ServiceRow, selected: ServiceOption | null): void {
    if (!selected) {
      this.state.updateServiceRow(row.rowId, { serviceId: null, serviceName: '', itemPrice: 0 });
      return;
    }

    if (this.isMedicineType) {
      const price = this.calculateMedicinePrice(selected.price, selected.subUnitNo);
      const qty = this.calculateMedicineQty(
        row.units || 0,
        row.repeat || 0,
        row.duration || 0,
        selected.doseUnitNo || 1,
        selected.subUnitNo || 1
      );

      this.state.updateServiceRow(row.rowId, {
        serviceId: selected.serviceId,
        serviceName: selected.serviceName,
        itemPrice: price,
        qty: qty,
        doseUnitNo: selected.doseUnitNo,
        subUnitNo: selected.subUnitNo,
        unitSale: selected.unitSale,
        doseForm: selected.doseForm,
      });
    } else {
      this.state.updateServiceRow(row.rowId, {
        serviceId: selected.serviceId,
        serviceName: selected.serviceName,
        itemPrice: selected.price,
      });
    }
  }

  onServiceSelectById(row: ServiceRow, serviceId: string | null): void {
    const selected = this.serviceOptions.find((x) => x.serviceId === serviceId) ?? null;
    this.onServiceSelect(row, selected);
  }

  onRowFieldChange(row: ServiceRow, field: keyof ServiceRow, value: any): void {
    const updated: Partial<ServiceRow> = { [field]: value };

    if (this.isMedicineType &&
        (field === 'units' || field === 'repeat' || field === 'duration')) {
      const currentRow = this.state.serviceRows().find((r) => r.rowId === row.rowId)!;

      const units = field === 'units' ? value : currentRow.units;
      const repeat = field === 'repeat' ? value : currentRow.repeat;
      const duration = field === 'duration' ? value : currentRow.duration;

      updated.qty = this.calculateMedicineQty(
        units || 0,
        repeat || 0,
        duration || 0,
        row.doseUnitNo || 1,
        row.subUnitNo || 1
      );
    }

    this.state.updateServiceRow(row.rowId, updated);
  }

  onCareItemSelect(row: ServiceRow, careItemId: string | null): void {
    this.onRowFieldChange(row, 'careItemId', careItemId);

    if (!careItemId) {
      this.state.updateServiceRow(row.rowId, { coPercent: 0 });
      return;
    }

    const memberId = this.state.member()?.memberId;
    if (!memberId) return;

    this.approvalService.getCoinsuranceOfMedItem(memberId, Number(careItemId)).subscribe({
      next: (res: any) => {
        const coValue = res?.data?.coPercent ?? res?.coPercent ?? res?.data ?? res ?? 0;
        this.state.updateServiceRow(row.rowId, { coPercent: coValue });
      },
      error: () => {
        this.state.updateServiceRow(row.rowId, { coPercent: 0 });
      },
    });
  }

  trackByRowId(index: number, row: ServiceRow): string {
    return row.rowId;
  }

  /** True when at least one service line has a service chosen. */
  hasSelectedService(): boolean {
    return this.state.serviceRows().some((r) => !!r.serviceId);
  }

  /** Unit-of-sale label (Strip / Box / …) shown under the Qty input for medicines. */
  unitLabel(row: ServiceRow): string {
    return row.unitSale || row.doseForm || '';
  }

  // ── per-row inline validation helpers (used after the first submit attempt) ──
  rowServiceInvalid(row: ServiceRow): boolean {
    return this.submitted && !row.serviceId;
  }

  rowQtyInvalid(row: ServiceRow): boolean {
    return this.submitted && !!row.serviceId && !((row.qty || 0) > 0);
  }

  rowCareItemInvalid(row: ServiceRow): boolean {
    return this.submitted && !!row.serviceId && !row.careItemId;
  }

  // =========================
  // ATTACHMENTS
  // =========================
  handleFileSelect(event: any): void {
    const files = event.target.files;
    if (files && files.length > 0) {
      this.state.addFiles(files);
    }
  }

  handleFileDrop(event: DragEvent): void {
    event.preventDefault();
    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.state.addFiles(files);
    }
  }

  removeFile(index: number): void {
    this.state.removeFile(index);
  }

  totalSizeMb(): string {
    const totalBytes = this.state.selectedFiles().reduce((sum, f) => sum + f.size, 0);
    return (totalBytes / (1024 * 1024)).toFixed(1);
  }

  fileSizeMb(file: File): string {
    return (file.size / (1024 * 1024)).toFixed(1);
  }

  // =========================
  // SUBMIT / CANCEL / DRAFT
  // =========================
  private validateForm(): string[] {
    const errors: string[] = [];

    if (!this.state.member()) errors.push('Member is required — check a valid Member ID first.');
    if (!this.state.selectedType()) errors.push('Select a request type.');
    if (!this.state.selectedVendor()) errors.push('Select a vendor.');

    const date = this.state.approvalDate();
    if (!date) {
      errors.push('Approval Date is required.');
    } else if (date < this.minDate) {
      errors.push('Approval Date cannot be before today.');
    }

    if (this.state.diagnosisIds().length === 0) {
      errors.push('Select at least one Diagnosis.');
    }

    const rows = this.state.serviceRows();
    if (!this.hasSelectedService()) {
      errors.push('Add at least one service item.');
    } else {
      if (rows.some((r) => !r.serviceId)) {
        errors.push('Every service row must have a service selected (or remove the empty row).');
      }
      if (rows.some((r) => !!r.serviceId && !((r.qty || 0) > 0))) {
        errors.push('Every service must have a quantity greater than 0.');
      }
      if (rows.some((r) => !!r.serviceId && !r.careItemId)) {
        errors.push('Every service must have a Care Item (med item) selected.');
      }
    }

    return errors;
  }

  /**
   * Warns once per package when the selected service rows fully cover a package:
   * the approval is priced at the package price, not the sum of item prices.
   */
  private checkServicePackages(rows: ServiceRow[]): void {
    if (!this.servicePackages.length) return;

    const selectedIds = rows.map((r) => Number(r.serviceId ?? 0));
    const covered = findCoveredPackages(selectedIds, this.servicePackages);

    // forget packages that are no longer fully selected, so re-selecting warns again
    const coveredIds = new Set(covered.map((p) => p.packageId));
    for (const id of [...this.alertedPackageIds]) {
      if (!coveredIds.has(id)) this.alertedPackageIds.delete(id);
    }

    const fresh = covered.filter((p) => !this.alertedPackageIds.has(p.packageId));
    if (!fresh.length) return;

    fresh.forEach((p) => this.alertedPackageIds.add(p.packageId));

    const list = fresh
      .map(
        (p) =>
          `<li><b>${p.packageName || 'Package #' + p.packageId}</b> — package price <b>${p.packagePrice.toLocaleString()}</b></li>`
      )
      .join('');

    Swal.fire({
      title: fresh.length > 1 ? 'Service packages selected' : 'Service package selected',
      html:
        `You selected all services of the following package(s). This approval will be priced ` +
        `at the <b>package price</b>, not the sum of the individual service prices:` +
        `<ul style="text-align:left;list-style-position:inside;margin:8px 0 0;padding:0;">${list}</ul>`,
      icon: 'info',
      confirmButtonColor: '#0e7360',
    });
  }

  submitRequest(): void {
    this.submitted = true;

    const validationErrors = this.validateForm();
    if (validationErrors.length > 0) {
      Swal.fire({
        title: 'Validation Error',
        html: `<ul style="text-align:left;list-style-position:inside;margin:0;padding:0;">${validationErrors
          .map((e) => `<li>${e}</li>`)
          .join('')}</ul>`,
        icon: 'error',
        confirmButtonColor: '#d33',
      });
      return;
    }

    const claim = {
      membId: this.state.member()?.memberId ?? '',
      serviceDate: new Date(this.state.approvalDate()),
      presId: this.state.selectedVendor()?.id ?? '',
      phone: this.state.member()?.mobile ?? '',
      diagnosisString: this.state.diagnosisIds().join(','),
      diagnosisInsString: this.state.diagnosisIds().join(','),
      notes: this.state.notes(),

      services: this.state.serviceRows().map((x) => ({
        productId: Number(x.serviceId ?? 0),
        qty: x.qty ?? 0,
        price: x.itemPrice ?? 0,
        units: x.units ?? 0,
        rep: x.repeat ?? 0,
        duration: x.duration ?? 0,
      })),
    };

    this.submitting = true;

    this.approvalService.createRequestClaim(claim, this.state.selectedFiles()).subscribe({
      next: (res) => {
        this.submitting = false;
        if (res.success) {
          Swal.fire({
            title: 'Success!',
            text: res.message || 'Request created successfully.',
            icon: 'success',
            confirmButtonColor: '#3085d6',
          });
          this.state.reset();
          this.searchTerm = '';
          this.memberChecked = false;
          this.submitted = false;
        } else {
          Swal.fire({
            title: 'Warning!',
            text: res.message || 'Could not process the request.',
            icon: 'warning',
            confirmButtonColor: '#3085d6',
          });
        }
      },
      error: (err) => {
        this.submitting = false;
        console.error(err);
        const errorMessage = err.error?.message || 'Server Error. Please try again later.';
        Swal.fire({
          title: 'Error!',
          text: errorMessage,
          icon: 'error',
          confirmButtonColor: '#d33',
        });
      },
    });
  }

  saveDraft(): void {
    console.log('Save Draft');
    console.log(this.state);
  }

  cancel(): void {
    if (confirm('Are you sure you want to cancel?')) {
      this.state.reset();
      this.searchTerm = '';
      this.memberChecked = false;
      this.memberError = '';
      this.submitted = false;
    }
  }
}
