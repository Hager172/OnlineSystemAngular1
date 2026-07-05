export interface MemberSearchResult {
  memberId: string;
  memberName: string;
  customerName?: string;
  mobile?: string;
  cardImageUrl?: string;
  nationalId?: string;
  birthDate?: string;
  status?: 'Active' | 'Inactive';
}
export interface VendorOption {
  id: string;
  vendorName: string;
}

export interface BranchOption {
  branchId: string;
  branchName: string;
}

export interface DiagnosisOption {
  id: string; // أو number حسب الـ Database عندك
  name: string;
}

// الموديل الخاص بـ Submit للفورم بالكامل ليتوافق مع الـ ClaimDto في الباك إند
export interface CreateClaimRequest {
  memberId: string;
  approvalType: string;
  vendorId: string;
  branchId?: string | null;
  approvalDate: string;
  diagnoses: any[]; 
  maxLimit?: number | null;
  notes?: string;
  privateNotes?: string;
  claimAmount?: string;
  isException?: boolean;
}

export interface ServiceOption {
  serviceId: string;
  serviceName: string;
  price: number;
  doseUnitNo?: number; // خاص بالأدوية بس - بييجي من الـ service نفسه
  subUnitNo?: number;  // خاص بالأدوية بس - بييجي من الـ service نفسه
}

export interface CareItemOption {
  id: string;
  name: string;
}
export interface ServiceRow {
  rowId: string;
  serviceId: string | null;
  serviceName: string;

  // خاصة بـ Medicine بس
  units: number | null;
  repeat: number | null;      // REP (dose_repeat) - داخل في معادلة الحساب
  duration: number | null;
  isChronic: boolean;
  repeatCount: number | null; // عمود REPEAT الأخير - منفصل، معناه لسه مش مؤكد

  // مشتركة بين الأنواع كلها
  qty: number | null;
  itemPrice: number;
  coPercent: number;
  careItemId: string | null;
  notes: string;

  // مخزّنة وقت اختيار الدواء - مش ظاهرة في الجدول، بس محتاجينها للحساب
  doseUnitNo?: number;
  subUnitNo?: number;
}