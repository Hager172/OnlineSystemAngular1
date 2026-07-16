import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ApprovallsclientDTO } from '../../shared/models/ApprovallsclientDTO';
import { ClientApproval } from '../../core/services/clientApprovalls/client-approval';
import { PopupService } from '../../core/services/popup/popup-service';

@Component({
  selector: 'app-approval-result',
  standalone: true,
  imports: [CommonModule],
templateUrl: './approval-result.html',
  styleUrls: ['./approval-result.css'] 
})
export class ApprovalResultComponent implements OnInit {
  result: ApprovallsclientDTO | null = null;
  searchType: 'approval' | 'member' | null = null;
 newClaim: any = {
    insuredId: '',
    claimId: '',
    externalPrescription: '',
    claimDate: '',
    diagnosis: '',
    mobile: '01021737912',
    memberId: '',
    memberName: ''
  };
  constructor(private router: Router,private service :ClientApproval, private popup: PopupService) {
    // بنجيب البيانات من state
    const navigation = this.router.getCurrentNavigation();
    if (navigation?.extras?.state) {
      this.result = navigation.extras.state['result'];
      this.searchType = navigation.extras.state['searchType'];
    }
  }

  ngOnInit(): void {
    // لو مفيش داتا، نرجع للصفحة الرئيسية
    // if (!this.result) {
    //   this.router.navigate(['/clientapprovals']);
    // }
  }

  goBack(): void {
    this.router.navigate(['/clientapprovals']);
  }

  makeAnotherApproval(): void {
    // هنا هتكتبي لوجيك عمل ابروفال تاني
    console.log('Making another approval for:', this.result);
    this.router.navigate(['/new-approval'], {
      state: { memberData: this.result }
    });
  }

  viewFullDetails(): void {
    console.log('Viewing full details:', this.result);
  }

 submitClaim(): void {
    // تجهيز البيانات للإرسال
    const claimData = {
      insuredId: this.newClaim.insuredId,
      claimId: this.newClaim.claimId,
      externalPrescription: this.newClaim.externalPrescription,
      claimDate: this.newClaim.claimDate,
      diagnosis: this.newClaim.diagnosis,
      mobile: this.newClaim.mobile,
      memberId: this.newClaim.memberId,
      memberName: this.newClaim.memberName,
    };

    // التحقق من الحقول المطلوبة
    if (!claimData.claimId || !claimData.claimDate || !claimData.diagnosis) {
      this.popup.warning('Missing Fields', 'Please fill in all required fields');
      return;
    }

    // استدعاء السيرفس
    this.service.add(claimData).subscribe({
      next: (response) => {
        this.popup.success('Claim Submitted', 'Your claim has been submitted successfully').then(() => {
          // لو عايزة تعملي حاجة بعد النجاح، مثلاً تفضي الفورم
          this.resetForm();
        });
      },
      error: (error) => {
        console.error('Error submitting claim:', error);
        this.popup.error('Submission Failed', 'Failed to submit claim. Please try again.');
      }
    });
  }
resetForm(): void {
  this.newClaim = {
    insuredId: this.result?.id || '',
    claimId: '',
    externalPrescription: '',
    claimDate: '',
    diagnosis: '',
    mobile: '',
    memberId: this.result?.id || '',
    memberName: this.result?.note || ''
  };
  
  // اختياري: رسالة تأكيد بسيطة
  console.log('Form reset successfully');
}
}
