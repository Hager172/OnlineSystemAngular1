import { Component, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgSelectComponent, NgSelectModule } from '@ng-select/ng-select';
import { VendorService } from '../../../core/services/vendor/vendor-service';
import { RequestStateService } from '../../../core/services/request-state/request-state';
import { ServiceOption, CareItemOption, ServiceRow } from '../../models/member-search';
import { ApprovalService } from '../../../core/services/Approval/approval-service';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
@Component({
  selector: 'app-request-services',
  standalone: true,
  imports: [CommonModule, FormsModule, NgSelectModule],
  templateUrl: './request-services.html',
  styleUrl: './request-services.css',
})
export class RequestServices {
  constructor(
    private vendorService: VendorService,
    public state: RequestStateService,
  private approvalService: ApprovalService,
  ) {
effect(() => {

  this.state.selectedVendor();

  this.serviceOptions = [];
  this.state.serviceRows.set([]);

});

    this.serviceSearch$
  .pipe(
    debounceTime(300),
    distinctUntilChanged()
  )
  .subscribe(term => {

    const vendor = this.state.selectedVendor();
console.log("Selected Vendoridddd:", vendor?.id);
    if (!vendor || !term || term.length < 2) {
      this.serviceOptions = [];
      return;
    }

    this.approvalService
  .getAgentProducts(term, vendor.id)
  .subscribe({
    next: (res: any) => {

      this.serviceOptions = res.map((x: any) => ({
  serviceId: x.id,
  serviceName: x.name,
  price: x.price,
  doseUnitNo: x.doseUnitNo,   
  subUnitNo: x.subUnitNo     
}));

      console.log(this.serviceOptions); // 👈 أضيفي دي

    },
    error: () => {
      this.serviceOptions = [];
    }
  });

  });
  }

  serviceOptions: ServiceOption[] = [];
  careItemOptions: CareItemOption[] = [];
  loadingServices: boolean = false;
  serviceSearch$ = new Subject<string>();

  get isMedicineType(): boolean {
    return this.state.selectedType() === 'Pharmacy';
  }

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
      });
    } else {
      this.state.updateServiceRow(row.rowId, {
        serviceId: selected.serviceId,
        serviceName: selected.serviceName,
        itemPrice: selected.price,
      });
    }
  }

  onRowFieldChange(row: ServiceRow, field: keyof ServiceRow, value: any): void {
    const updated: Partial<ServiceRow> = { [field]: value };

    if (this.isMedicineType && (field === 'units' || field === 'repeat' || field === 'duration')) {
      const units = field === 'units' ? value : row.units;
      const repeat = field === 'repeat' ? value : row.repeat;
      const duration = field === 'duration' ? value : row.duration;

      updated['qty'] = this.calculateMedicineQty(
        units || 0,
        repeat || 0,
        duration || 0,
        row.doseUnitNo || 1,
        row.subUnitNo || 1
      );
    }

    this.state.updateServiceRow(row.rowId, updated);
  }

  onServiceSelectById(row: ServiceRow, serviceId: string | null): void {
    const selected = this.serviceOptions.find(x => x.serviceId === serviceId) ?? null;

    // نضمن إن العنصر المختار يفضل موجود في القايمة حتى لو نتائج البحث اتغيرت بعدين
    if (selected && !this.serviceOptions.some(x => x.serviceId === selected.serviceId)) {
      this.serviceOptions = [...this.serviceOptions, selected];
    }

    this.onServiceSelect(row, selected);
  }

  trackByRowId(index: number, row: ServiceRow): string {
    return row.rowId;
  }
}