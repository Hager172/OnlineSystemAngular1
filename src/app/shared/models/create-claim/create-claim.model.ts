export interface ClaimDto {

  membId: string;

  serviceDate: Date;

  presId: string;

  phone?: string;

  diagnosisString?: string;

  diagnosisInsString?: string;

  notes?: string;

  services: ClaimServiceItemDto[];
}

export interface ClaimServiceItemDto {

  productId: number;

  qty: number;

  price: number;

  units: number;

  rep: number;

  duration: number;
}

export interface OnlineServiceItemDto {

  id?: number;

  name?: string;

  price?: number;

  quantity?: number;

  isOneUnit?: boolean;

  status?: string;

  reason?: string;

  days?: number;

  medItem?: number;

  covered?: string;
}

export interface ClaimResultDto {

  result: string;
}

export interface CreateClaimResponseDto {

  success: boolean;

  message: string;

  result?: ClaimResultDto;
}

export interface PrescriptionItem {

  productId: number|null;

  units: number;

  repeat: number;

  days: number;

  price: number;

  qty: number;
}

export interface ProductLookupDto {
  id: number;
  name: string;
  price: number;

  doseUnitNo: number;
  subUnitNo: number;
}