export interface ClaimDto {

  membId: string;

  serviceDate: Date;

  presId: string;

  phone?: string;
 
  diagnosisString?: string;

  diagnosisInsString?: string;

  notes?: string;

  nationalId?: string;

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

  claimId?: string;
}

export interface CreateClaimResponseDto {

  success: boolean;

  message: string;

  result?: ClaimResultDto;
}

export interface PrescriptionItem {
  productId: number | null;

  units: number | null;
  repeat: number | null;
  days: number | null;
 tooth?: string | null;
 position?: string | null;
  price: number;
  qty: number;

  product?: ProductLookupDto;

  /**
   * Set on a line that replaces the services of a fully-covered package.
   * `productId` then holds the package id and `price` the package price.
   */
  isPackage?: boolean;
  packageName?: string;
  /** Names of the service lines this package line replaced, joined for display. */
  packageServices?: string;
}

export interface ProductLookupDto {
  id: number;
  name: string;
  price: number;
  doseUnitNo: number;
  subUnitNo: number;
  /** Unit-of-measure names when the API provides them (e.g. Strip, Box, Tablet). */
  unitName?: string;
  doseUnitName?: string;
  subUnitName?: string;
}