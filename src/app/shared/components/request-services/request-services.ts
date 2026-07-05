import { Component, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgSelectComponent, NgSelectModule } from '@ng-select/ng-select';
import { VendorService } from '../../../core/services/vendor/vendor-service';
import { RequestStateService } from '../../../core/services/request-state/request-state';
import { ServiceOption, CareItemOption, ServiceRow } from '../../models/member-search';

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
    public state: RequestStateService
  ) {
    effect(() => {
      const vendor = this.state.selectedVendor();
      this.serviceOptions = [];
      this.state.serviceRows.set([]);

      if (vendor?.vendorId) {
        this.loadVendorServices(vendor.vendorId);
      }
    });
  }

  serviceOptions: ServiceOption[] = [];
  careItemOptions: CareItemOption[] = [];
  loadingServices: boolean = false;

  private loadVendorServices(vendorId: string): void {
    this.loadingServices = true;
    this.vendorService.getVendorServices(vendorId).subscribe({
      next: (res: any) => {
        this.loadingServices = false;
        const raw = res?.data?.items ?? res?.data ?? res ?? [];
        this.serviceOptions = raw.map((s: any) => ({
          serviceId: s.serviceId ?? s.id ?? s.itemId ?? '',
          serviceName: s.serviceName ?? s.name ?? s.itemName ?? 'Unknown Service',
          price: s.price ?? s.unitPrice ?? 0,
          doseUnitNo: s.dose_unit_no ?? s.doseUnitNo,
          subUnitNo: s.sub_unit_no ?? s.subUnitNo,
        }));
      },
      error: () => {
        this.loadingServices = false;
        this.serviceOptions = [];
      },
    });
  }

  get isMedicineType(): boolean {
    return this.state.selectedType() === 'Medicine';
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
        row.units || 1,
        row.repeat || 1,
        row.duration || 1,
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
        units || 1,
        repeat || 1,
        duration || 1,
        row.doseUnitNo || 1,
        row.subUnitNo || 1
      );
    }

    this.state.updateServiceRow(row.rowId, updated);
  }
}