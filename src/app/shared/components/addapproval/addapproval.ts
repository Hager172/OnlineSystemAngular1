import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router'; // تم إضافة RouterModule عشان الـ routerLink يشتغل

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
import { get } from 'http';

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
    private authService: AuthService,
    private memberService: MemberService
  ) {}

  diagnosisSearch$ = new Subject<string>();
  productSearch$ = new Subject<string>();

  // =========================
  // FORM DATA (Signals & Primitive)
  // =========================
  insuredId: string = '';
  member = signal<any>(null); // تحويل الميمبر إلى سجنال هنا
  nationalId=signal<string>('');
  claimId: string = '';
  externalPrescription: boolean = false;
  claimDate: string = new Date().toISOString().split('T')[0]; // تاريخ اليوم بشكل افتراضي
  diagnosisIds: string[] = [];
  mobile = signal<string>(''); // السجنال الخاص بالموبايل
  notes: string = '';
  // مصفوفة لحفظ الملفات المرفوعة مؤقتاً
selectedFiles: File[] = [];
  coPayment: number = 0;
  coPaymentAmount: number = 0;
  memberPhoto: string = 'assets/images/member-photo.png';

  // =========================
  // DROPDOWNS & ITEMS
  // =========================
  diagnosisOptions: DiagnosisDto[] = [];
  productOptions: ProductLookupDto[] = [];

  prescriptionItems: PrescriptionItem[] = [
    {
      productId: null,
      units: 1,
      repeat: 1,
      days: 1,
      price: 0,
      qty: 1
    }
  ];

  // =========================
  // INIT
  // =========================
  ngOnInit(): void {
    let savedData = this.memberService.getMemberData();

    if (!savedData) {
      const localMember = localStorage.getItem('saved_member_data');
      if (localMember) {
        savedData = JSON.parse(localMember);
      }
    } else {
      localStorage.setItem('saved_member_data', JSON.stringify(savedData));
    }

    if (savedData) {
      this.insuredId = savedData.memberId;

      this.approvalService.getMemberInfo(this.insuredId, 'Ph').subscribe({
        next: (res) => {
          console.log('Member Info:', res);
          this.member.set(res); // تحديث الـ Signal الخاص بالميمبر

          if (res.mobile) {
            this.mobile.set(res.mobile); // تحديث سجنال الموبايل
          }
if(res.memberNationalId){
            this.nationalId.set(res.memberNationalId);
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

    this.diagnosisSearch$.subscribe(term => {
      if (!term || term.length < 3) return;
      this.approvalService.getDiagnosis(term).subscribe(res => {
        this.diagnosisOptions = res;
      });
    });

    this.productSearch$.subscribe(term => {
      if (!term || term.length < 3) return;
      this.approvalService.getProducts(term, "Ph").subscribe(res => {
        console.log('Product Options:', res); // Debugging line
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
      productId: null, units: 1, repeat: 1, days: 1, price: 0, qty: 1
    });
  }

  removePrescriptionItem(index: number): void {
    this.prescriptionItems.splice(index, 1);
  }

  // =========================
  // SUBMIT
  // =========================
  handleSubmit(): void {
    const claimDto: ClaimDto = {
      membId: this.insuredId,
      serviceDate: new Date(this.claimDate),
      presId: this.externalPrescription ? '-564000' : this.claimId,
      phone: this.mobile(), // قراءة السجنال باستخدام الاقواس ()
      diagnosisString: this.diagnosisIds.join(','),
      diagnosisInsString: this.diagnosisIds.join(','),
      notes: this.notes,
      services: this.prescriptionItems.map(x => ({
        productId: x.productId??0,
        qty: x.qty,
        price: x.price,
        units: x.units,
        rep: x.repeat,
        duration: x.days
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
    this.claimDate = '2026-02-24';
    this.diagnosisIds = [];
    this.mobile.set(''); // تصفير السجنال
    this.member.set(null); // تصفير سجنال الكارد
    this.notes = '';
    this.coPayment = 0;
    this.coPaymentAmount = 0;
    this.prescriptionItems = [{ productId: 0, units: 1, repeat: 1, days: 1, price: 0, qty: 1 }];
  }

  // =========================
  // CALCULATIONS & UPDATES
  // =========================
  onItemChange(item: PrescriptionItem): void {
    item.qty = (item.units || 0) * (item.repeat || 0) * (item.days || 0);
    if (item.qty === 0) item.qty = 1;
    this.updateSubTotals();
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

  onCoPercentChange(): void {
    const subTotal = parseFloat(this.calculateSubTotal());
    if (subTotal > 0) {
      this.coPaymentAmount = parseFloat(((subTotal * (this.coPayment || 0)) / 100).toFixed(2));
    } else {
      this.coPaymentAmount = 0;
    }
  }
// 1. التعامل مع اختيار الملفات عن طريق الـ Browse (الكليك)
handleFileSelect(event: any): void {
  const files = event.target.files;
  if (files && files.length > 0) {
    this.processFiles(files);
  }
}

// 2. التعامل مع الملفات عن طريق الـ Drag & Drop (السحب والإفلات)
handleFileDrop(event: DragEvent): void {
  event.preventDefault();
  const files = event.dataTransfer?.files;
  if (files && files.length > 0) {
    this.processFiles(files);
  }
}

// 3. دالة معالجة الملفات وحفظها في المصفوفة
private processFiles(fileList: FileList): void {
  for (let i = 0; i < fileList.length; i++) {
    this.selectedFiles.push(fileList[i]);
  }
  console.log('Selected Files:', this.selectedFiles);
}

resetForm(): void {
  this.claimId = '';
  this.claimDate = '';
  this.notes = '';
  this.externalPrescription = false;

  this.selectedFiles = [];

  // تصفير الـ arrays والـ ng-select داتا
  this.diagnosisIds = [];
 this.prescriptionItems = [
    { productId: null, units: 1, repeat: 1, days: 1, price: 0, qty: 1 }
  ]; // لو عايز تسيب سطر فاضي للمستخدم يكتب فيه علطول، ممكن تخليها: this.prescriptionItems = [{ productId: null, units: null, repeat: null, days: null, price: null, qty: null }];

  // تحديث الحسابات الإجمالية للفورم بعد التصفير
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

  onProductSelect(selectedProduct: any, item: PrescriptionItem): void {
    if (selectedProduct) {
      item.price = selectedProduct.price || 0;
    } else {
      item.price = 0;
    }
    this.onItemChange(item);
  }

  // دالة مسح الـ Diagnosis
onDiagnosisClear(): void {
  this.diagnosisOptions = [];    // تفضي الليسته
  this.diagnosisSearch$.next(''); // تبعت signal فاضي عشان الـ typeahead
}

// دالة مسح الـ Product
onProductClear(): void {
  this.productOptions = [];
  this.productSearch$.next('');
}

// دالة للبحث - فيها تحسين إنها متجيش بالنتايج لو الكلمة أقل من 3 حروف (لازم عندك سيرفر بيقبل)
onDiagnosisSearch($event: any): void {
  const term = $event?.term;
  if (term && term.length >= 2) {
    this.diagnosisSearch$.next(term);
  } else if (!term || term.length === 0) {
    this.diagnosisOptions = [];
  }
}
}
