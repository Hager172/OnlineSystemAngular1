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
  vendorId: string;
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