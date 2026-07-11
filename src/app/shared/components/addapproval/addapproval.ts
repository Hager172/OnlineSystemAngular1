import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';

import { ApprovalService } from '../../../core/services/Approval/approval-service';
import { AuthService } from '../../../core/services/auth/auth-service';

import {
  ClaimDto,
  CreateClaimResponseDto,
  PrescriptionItem,
  ProductLookupDto
} from '../../models/create-claim/create-claim.model';

import { DiagnosisDto } from '../../models/create-claim/DiagnosisDto';
import { NgSelectComponent, NgSelectModule } from '@ng-select/ng-select';
import { Subject } from 'rxjs';
import Swal from 'sweetalert2';
import { MemberService } from '../../../core/services/member/member-service';

@Component({
  selector: 'app-addapproval',
  standalone: true,
  imports: [CommonModule, FormsModule, NgSelectComponent, NgSelectModule, RouterModule],
  templateUrl: './addapproval.html',
  styleUrl: './addapproval.css',
})
export class Addapproval implements OnInit {

  constructor(
    private approvalService: ApprovalService,
    private router: Router,
    private route: ActivatedRoute,
    private authService: AuthService,
    private memberService: MemberService
  ) {}

  /** True when the member search found a valid member with no approvals and sent the user here. */
  redirectedNoApprovals = false;

  diagnosisSearch$ = new Subject<string>();
  productSearch$ = new Subject<string>();

  // =========================
  // FORM DATA (Signals & Primitive)
  // =========================
  insuredId: string = '';
  member = signal<any>(null); 
  nationalId = signal<string>('');
  claimId: string = '';
  externalPrescription: boolean = false;
  
  // تواريخ الفاليديشن لنطاق الـ 7 أيام
  claimDate: string = '';
  minClaimDate: string = '';
  maxClaimDate: string = '';
diagnosisIds: string[] = [];
  mobile = signal<string>(''); 
  notes: string = '';
  selectedFiles: File[] = [];
  coPayment: number = 0;
  coPaymentAmount: number = 0;
  memberPhoto: string = 'assets/images/member-photo.png';
vendorType: string | null = null;
  // =========================
  // DROPDOWNS & ITEMS
  // =========================
  diagnosisOptions: DiagnosisDto[] = [];
  productOptions: ProductLookupDto[] = [];

  prescriptionItems: PrescriptionItem[] = [
    {
      productId: null,
      units: null,
      repeat: null,
      days: null,
      price: 0,
      qty: 0
    }
  ];

  // =========================
  // INIT
  // =========================
 ngOnInit(): void {
  this.vendorType = this.authService.getVendorType();
  console.log('Vendor Type on Init:', this.vendorType);
  this.redirectedNoApprovals = this.route.snapshot.queryParamMap.get('noApprovals') === '1';
  // حساب نطاق الـ 7 أيام (كودك زي ما هو)
  const today = new Date();
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(today.getDate() - 7);

  this.maxClaimDate = today.toISOString().split('T')[0];
  this.minClaimDate = sevenDaysAgo.toISOString().split('T')[0];
  this.claimDate = this.maxClaimDate; 

  // 🔥 الـتـعديـل هـنـا: بنقرا الداتا من الـ Signal (بنادي عليه كأنه دالة)
  let savedData = this.memberService.memberData();
  console.log('Saved Member Data from Signal:', savedData);

  // فكك من الـ if والـ else والـ localStorage اللي كانوا هنا.. 
  // لأن السيرفيس الجديدة بقت بتعمل ده لوحدها أول ما بتفتح وبترجع الداتا جاهزة!

  if (savedData) {
    this.insuredId = savedData.memberId; // تأكد إن الـ Object جواه فعلاً الاسم ده
const vendorType = this.authService.getVendorType();
console.log('Vendor Type:', vendorType);
    this.approvalService.getMemberInfo(this.insuredId, vendorType??'').subscribe({
      next: (res) => {
        console.log('Member Info:', res);
        this.member.set(res); 

        if (res.mobile) {
          this.mobile.set(res.mobile); 
        }

        if (res.memberNationalId && res.memberNationalId !== '0' && res.memberNationalId !== 0) {
          this.nationalId.set(res.memberNationalId.toString());
        } else {
          this.nationalId.set('');
        }

        this.memberPhoto = res.cardImageUrl ? res.cardImageUrl : 'assets/images/member-photo.png';

        if (res.coinsurance !== undefined && res.coinsurance !== null) {
          this.coPayment = res.coinsurance;
          this.onCoPaymentChange();
        }
      },
      error: (err) => {
        console.log('Error loading member info:', err);
      }
    });
  }

  // بقية الـ streams بتاعتك تحت زي ما هي...
  // this.diagnosisSearch$.subscribe(term => { /* ... */ });
  // this.productSearch$.subscribe(term => { /* ... */ });
   this.diagnosisSearch$.subscribe(term => {
      if (!term || term.length < 3) return;
      this.approvalService.getDiagnosis(term).subscribe(res => {
        this.diagnosisOptions = res;
      });
    });

    this.productSearch$.subscribe(term => {
      if (!term || term.length < 3) return;
      const vendorType = this.authService.getVendorType();
      this.approvalService.getProducts(term, vendorType ?? '').subscribe(res => {
        this.productOptions = res;
      });
    });
}

  onExternalPrescriptionChange(): void {
    if (this.externalPrescription) {
      this.claimId = '';
    }
  }

  addPrescriptionItem(): void {
    this.prescriptionItems.push({
      productId: null, units: null, repeat: null, days: null, price: 0, qty: 0, tooth: null, position: null
    });
  }

  removePrescriptionItem(index: number): void {
    this.prescriptionItems.splice(index, 1);
  }

  // =========================
  // SUBMIT
  // =========================
  handleSubmit(): void {
    const currentNationalId = this.nationalId();

    // فاليديشن: لو المستخدم كاتب داتا في الـ National ID، لازم تبق 14 رقم بالظبط
    if (currentNationalId && currentNationalId.trim() !== '') {
      const natIdRegex = /^[0-9]{14}$/;
      if (!natIdRegex.test(currentNationalId.trim())) {
        Swal.fire({
          title: 'Validation Error',
          text: 'National ID must be exactly 14 digits.',
          icon: 'error',
          confirmButtonColor: '#d33'
        });
        return; 
      }
    }

    const claimDto: ClaimDto = {
      membId: this.insuredId,
      serviceDate: new Date(this.claimDate),
      presId: this.externalPrescription ? '-564000' : this.claimId,
      phone: this.mobile(), 
      diagnosisString: this.diagnosisIds.join(','),
      diagnosisInsString: this.diagnosisIds.join(','),
      notes: this.notes,
      // لو مش مكتوب بنبعته نص فارغ مش "0"
//       tooth: x.tooth ?? null,
// position: x.position ?? null,
      nationalId: currentNationalId ? currentNationalId.trim() : '', 
      services: this.prescriptionItems.map(x => ({
        productId: x.productId ?? 0,
        qty: x.qty,
        price: x.price,
        units: x.units ?? 0,
        rep: x.repeat ?? 0,
        duration: x.days ?? 0
      }))
    };

    console.log('Claim DTO:', claimDto);

    this.approvalService.createClaim(claimDto).subscribe({
      next: (res: CreateClaimResponseDto) => {
        if (res.success) {
          Swal.fire({
            title: 'Success!',
            text: res.message || 'Claim created successfully.',
            icon: 'success',
            confirmButtonColor: '#3085d6',
            confirmButtonText: 'OK'
          });
          this.resetForm();
        } else {
          Swal.fire({
            title: 'Warning!',
            text: res.message || 'Could not process the claim.',
            icon: 'warning',
            confirmButtonColor: '#3085d6',
            confirmButtonText: 'Review Data'
          });
        }
      },
      error: (err) => {
        const errorMessage = err.error?.message || 'Server Error. Please try again later.';
        Swal.fire({
          title: 'Error!', text: errorMessage, icon: 'error', confirmButtonColor: '#d33', confirmButtonText: 'Close'
        });
      }
    });
  }

  handleCancel(): void {
    if (!confirm('Are you sure you want to cancel?')) return;

    this.insuredId = '';
    this.nationalId.set('');
    this.claimId = '';
    this.externalPrescription = false;
    this.claimDate = this.maxClaimDate;
    this.diagnosisIds = [];
    this.mobile.set(''); 
    this.member.set(null); 
    this.notes = '';
    this.coPayment = 0;
    this.coPaymentAmount = 0;
    this.prescriptionItems = [{ productId: 0, units: 1, repeat: 1, days: 1, price: 0, qty: 1 }];
  }

  // =========================
  // CALCULATIONS & UPDATES
  // =========================
  onItemChange(item: PrescriptionItem): void {
    this.calculateQty(item);
  }

  onCoPaymentChange(): void {
    const subTotal = parseFloat(this.calculateSubTotal());
    this.coPaymentAmount = parseFloat(((subTotal * this.coPayment) / 100).toFixed(2));
  }

  calculateTotal(item: PrescriptionItem): string {
    return ((item.price || 0) * (item.qty || 0)).toFixed(2);
  }

  calculateSubTotal(): string {
    const total = this.prescriptionItems.reduce((sum, item) => sum + ((item.price || 0) * (item.qty || 0)), 0);
    return total.toFixed(2);
  }

  calculateNet(): string {
    const subTotal = parseFloat(this.calculateSubTotal());
    return (subTotal - (this.coPaymentAmount || 0)).toFixed(2);
  }

  /** Count of prescription lines with a chosen product and quantity. */
  getTotalItems(): number {
    return this.prescriptionItems.filter((x) => x.productId && (x.qty || 0) > 0).length;
  }

  onCoPercentChange(): void {
    const subTotal = parseFloat(this.calculateSubTotal());
    if (subTotal > 0) {
      this.coPaymentAmount = parseFloat(((subTotal * (this.coPayment || 0)) / 100).toFixed(2));
    } else {
      this.coPaymentAmount = 0;
    }
  }

  handleFileSelect(event: any): void {
    const files = event.target.files;
    if (files && files.length > 0) {
      this.processFiles(files);
    }
  }

  handleFileDrop(event: DragEvent): void {
    event.preventDefault();
    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.processFiles(files);
    }
  }

  private processFiles(fileList: FileList): void {
    for (let i = 0; i < fileList.length; i++) {
      this.selectedFiles.push(fileList[i]);
    }
    console.log('Selected Files:', this.selectedFiles);
  }

  removeFile(index: number): void {
    this.selectedFiles.splice(index, 1);
  }

  resetForm(): void {
    this.claimId = '';
    this.claimDate = this.maxClaimDate;
    this.notes = '';
    this.externalPrescription = false;
    this.selectedFiles = [];
    this.diagnosisIds = [];
    this.nationalId.set(''); // تصفير دائم للرقم القومي بالفورم
    this.prescriptionItems = [
      { productId: null, units: null, repeat: null, days: null, price: 0, qty: 0 }
    ]; 

    if (this.updateSubTotals) {
      this.updateSubTotals();
    }

    this.coPayment = 0;
    this.coPaymentAmount = 0;
  }

  onCoAmountChange(): void {
    const subTotal = parseFloat(this.calculateSubTotal());
    if (subTotal > 0) {
      this.coPayment = parseFloat(((this.coPaymentAmount || 0) / subTotal * 100).toFixed(2));
    } else {
      this.coPayment = 0;
    }
  }

  updateSubTotals(): void {
    const subTotal = parseFloat(this.calculateSubTotal());
    if (this.coPayment > 0) {
      this.coPaymentAmount = parseFloat(((subTotal * this.coPayment) / 100).toFixed(2));
    } else if (this.coPaymentAmount > 0 && subTotal > 0) {
      this.coPayment = parseFloat(((this.coPaymentAmount / subTotal) * 100).toFixed(2));
    }
  }

  private calculateQty(item: PrescriptionItem): void {
    if (!item.product) {
      return;
    }

    const units = item.units || 0;
    const repeat = item.repeat || 0;
    const duration = item.days || 0;

    const dose = item.product.doseUnitNo || 1;
    const sub = item.product.subUnitNo || 1;

    let qty = (units * repeat * duration) / (dose / sub);
    const decimalPart = qty % 1;
    qty = Math.round(qty);

    if (decimalPart >= 0.3 && decimalPart < 0.5) {
      qty++;
    }

    item.qty = qty;
    this.updateSubTotals();
  }

onProductSelect(product: ProductLookupDto, item: PrescriptionItem): void {
    console.log(product);
    if (!product) {
      item.product = undefined;
      item.price = 0;
      item.qty = 0;
      return;
    }

    item.product = product;
    item.price = product.price / (product.subUnitNo ?? 1);
    this.calculateQty(item);
}

  onDiagnosisClear(): void {
    this.diagnosisOptions = [];    
    this.diagnosisSearch$.next(''); 
  }

  onProductClear(): void {
    this.productOptions = [];
    this.productSearch$.next('');
  }

  onDiagnosisSearch($event: any): void {
    const term = $event?.term;
    if (term && term.length >= 2) {
      this.diagnosisSearch$.next(term);
    } else if (!term || term.length === 0) {
      this.diagnosisOptions = [];
    }
  }
}