import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class MemberService {
  // 1. بنقرأ القيمة المبدئية من الـ localStorage لو موجودة
  private getInitialMember() {
    const localData = localStorage.getItem('saved_member_data');
    return localData ? JSON.parse(localData) : null;
  }

  // 2. عملنا الـ Signal وحطينا جواه الداتا المبدئية
  // عملناه read-only بره السيرفيس عشان محدش يغيره بره بالطريقة القديمة
  private memberState = signal<any>(this.getInitialMember());
  public memberData = this.memberState.asReadonly();

  // 3. دالة التحديث بتحدث الـ Signal والـ localStorage مع بعض في نفس الوقت
  setMemberData(data: any) {
    this.memberState.set(data);
    if (data) {
      localStorage.setItem('saved_member_data', JSON.stringify(data));
    } else {
      localStorage.removeItem('saved_member_data');
    }
  }

  // دالة لمسح البيانات لو حبيت تعمل Logout أو Clear للداتا
  clearMemberData() {
    this.setMemberData(null);
  }
}