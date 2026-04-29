import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
interface PrescriptionItem {
  id: string;
  product: string;
  units: number;
  repeat: number;
  days: number;
  price: number;
  qty: number;
}
@Component({
  selector: 'app-addapproval',
  imports: [CommonModule,FormsModule],
  templateUrl: './addapproval.html',
  styleUrl: './addapproval.css',
})
export class Addapproval {
  insuredId: string = '';
  nationalId: string = '';
  claimId: string = '';
  externalPrescription: boolean = false;
  claimDate: string = '2026-02-24';
  diagnosis: string = '';
  mobile: string = '';
  notes: string = '';
  coPayment: number = 0;
  coPaymentAmount: number = 0;
  
  prescriptionItems: PrescriptionItem[] = [
    { id: '1', product: '', units: 1, repeat: 1, days: 1, price: 0, qty: 1 }
  ];

  diagnosisOptions: string[] = [
    'Diabetes Type 2',
    'Hypertension',
    'Asthma',
    'Arthritis',
    'Migraine',
    'Allergies'
  ];

  productOptions: string[] = [
    'Aspirin 100mg',
    'Ibuprofen 200mg',
    'Amoxicillin 500mg',
    'Lisinopril 10mg'
  ];

  memberPhoto: string = 'assets/images/member-photo.png'; // Update with your actual image path

  onExternalPrescriptionChange(): void {
    if (this.externalPrescription) {
      this.claimId = '';
    }
  }

  addPrescriptionItem(): void {
    const newItem: PrescriptionItem = {
      id: Date.now().toString(),
      product: '',
      units: 1,
      repeat: 1,
      days: 1,
      price: 0,
      qty: 1
    };
    this.prescriptionItems.push(newItem);
  }

  removePrescriptionItem(id: string): void {
    this.prescriptionItems = this.prescriptionItems.filter(item => item.id !== id);
  }

  calculateTotal(item: PrescriptionItem): string {
    return (item.price * item.qty).toFixed(2);
  }

  calculateSubTotal(): string {
    const total = this.prescriptionItems.reduce(
      (sum, item) => sum + (item.price * item.qty), 
      0
    );
    return total.toFixed(2);
  }

  calculateNet(): string {
    const subTotal = parseFloat(this.calculateSubTotal());
    return (subTotal - this.coPaymentAmount).toFixed(2);
  }

  handleSubmit(): void {
    const formData = {
      insuredId: this.insuredId,
      nationalId: this.nationalId,
      claimId: this.externalPrescription ? '' : this.claimId,
      externalPrescription: this.externalPrescription,
      claimDate: this.claimDate,
      diagnosis: this.diagnosis,
      mobile: this.mobile,
      prescriptionItems: this.prescriptionItems,
      subTotal: this.calculateSubTotal(),
      coPayment: this.coPayment,
      coPaymentAmount: this.coPaymentAmount,
      net: this.calculateNet(),
      notes: this.notes
    };
    
    console.log('Form submitted', formData);
    alert('Form submitted successfully!');
  }

  handleCancel(): void {
    if (confirm('Are you sure you want to cancel? All changes will be lost.')) {
      this.insuredId = '';
      this.nationalId = '';
      this.claimId = '';
      this.externalPrescription = false;
      this.claimDate = '2026-02-24';
      this.diagnosis = '';
      this.mobile = '';
      this.notes = '';
      this.coPayment = 0;
      this.coPaymentAmount = 0;
      this.prescriptionItems = [
        { id: '1', product: '', units: 1, repeat: 1, days: 1, price: 0, qty: 1 }
      ];
    }
  }
}
