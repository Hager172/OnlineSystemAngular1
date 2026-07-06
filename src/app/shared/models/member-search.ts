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
  id: string; 
  name: string;
}

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
  doseUnitNo?: number; 
  subUnitNo?: number;  
}

export interface CareItemOption {
  id: string;
  name: string;
}
export interface ServiceRow {
  rowId: string;
  serviceId: string | null;
  serviceName: string;

  units: number | null;
  repeat: number | null;      
  duration: number | null;
  isChronic: boolean;
  repeatCount: number | null;

  qty: number | null;
  itemPrice: number;
  coPercent: number;
  careItemId: string | null;
  notes: string;

  doseUnitNo?: number;
  subUnitNo?: number;
}