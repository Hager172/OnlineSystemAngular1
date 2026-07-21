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

  /**
   * Quantity actually available at the pharmacy (0..qty). Persisted as ap_qty.
   * Optional: callers that don't set it fall back to `qty` in createClaim().
   */
  availableQty?: number;

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

  /**
   * Pharmacy-only. Quantity actually available to dispense; defaults to `qty`
   * and is kept clamped to the range 0..qty.
   */
  availableQty?: number | null;

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
  /** Minimum dispensing unit label (e.g. Strip, Box, Tablet), when not purely numeric. */
  unitSale?: string;
  doseForm?: string;
}