import { ApprovalItem } from "./approvalitem";
export interface Approval {
  approvalNumber: string;
  memberId?: string;
  date: string;
  notes?: string;
  diagnose?: string;
  companyName?: string;
  companyLogo?: string;
  vendorLogo?: string;
  branch?: string;
  invoiceNumber?: string;
  issueDate?: string;
  serviceDate?: string;
  clientName?: string;
  clientId?: string;
  clientPhone?: string;
  limit?: number;
  copaymentPercentage?: number;
  extraCopaymentPercentage?: number;
  items: ApprovalItem[];
  expiryDate?: string;
  itemCount?: number;
  vendorName?: string;

}