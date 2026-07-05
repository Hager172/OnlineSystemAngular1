import { Injectable, signal } from '@angular/core';
import {
  MemberSearchResult,
  VendorOption,
  BranchOption,
  ServiceRow,
} from '../../../shared/models/member-search';

@Injectable()
export class RequestStateService {
  // 1. Member
  member = signal<MemberSearchResult | null>(null);

  // 2. Type
  selectedType = signal<'Surgery' | 'Medicine' | 'Other' | null>(null);

  // 3. Vendor
  selectedVendor = signal<VendorOption | null>(null);

  // 4. Branch
  selectedBranch = signal<BranchOption | null>(null);

  // 5. Approval Date
  approvalDate = signal<string>(new Date().toISOString().split('T')[0]);

  // 6. Diagnosis
  diagnosisIds = signal<string[]>([]);

  // 7. Max Limit
  maxLimit = signal<number | null>(null);

  // Notes
  notes = signal<string>('');
  privateNotes = signal<string>('');
  claimAmount = signal<string>('');
  isException = signal<boolean>(false);
  approvalCode = signal<string>('');
  selectedSource = signal<string | null>(null);
  selectedContactMethods = signal<Set<string>>(new Set());

  // Attachments
  selectedFiles = signal<File[]>([]);

  // Services
  serviceRows = signal<ServiceRow[]>([]);

  addFiles(files: FileList | File[]): void {
    const current = this.selectedFiles();
    const toAdd = Array.from(files);
    this.selectedFiles.set([...current, ...toAdd]);
  }

  removeFile(index: number): void {
    const current = [...this.selectedFiles()];
    current.splice(index, 1);
    this.selectedFiles.set(current);
  }

  addEmptyServiceRow(): void {
    const newRow: ServiceRow = {
      rowId: crypto.randomUUID(),
      serviceId: null,
      serviceName: '',
      units: 1,
      repeat: 1,
      duration: 1,
      qty: 1,
      itemPrice: 0,
      coPercent: 0,
      careItemId: null,
      notes: '',
      isChronic: false,
      repeatCount: null,
    };
    this.serviceRows.set([...this.serviceRows(), newRow]);
  }

  updateServiceRow(rowId: string, changes: Partial<ServiceRow>): void {
    const updated = this.serviceRows().map((row) =>
      row.rowId === rowId ? { ...row, ...changes } : row
    );
    this.serviceRows.set(updated);
  }

  removeServiceRow(rowId: string): void {
    this.serviceRows.set(this.serviceRows().filter((r) => r.rowId !== rowId));
  }

  getRowValue(row: ServiceRow): number {
    return (row.itemPrice || 0) * (row.qty || 0);
  }

  getServicesSubtotal(): number {
    return this.serviceRows().reduce((sum, row) => sum + this.getRowValue(row), 0);
  }

  reset(): void {
    this.member.set(null);
    this.selectedType.set(null);
    this.selectedVendor.set(null);
    this.selectedBranch.set(null);
    this.diagnosisIds.set([]);
    this.maxLimit.set(null);
    this.notes.set('');
    this.privateNotes.set('');
    this.claimAmount.set('');
    this.isException.set(false);
    this.approvalCode.set('');
    this.selectedSource.set(null);
    this.selectedContactMethods.set(new Set());
    this.selectedFiles.set([]);
    this.serviceRows.set([]);
  }
}