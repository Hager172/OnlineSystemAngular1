export interface ApprovalReportDto {
  formId: string;
  approvalId: number;
  memberId: string;
  coinsurance?: number;
  empName: string;
  customerName: string;
  provName: string;
  branchName: string;
  approvalDate: Date | string;
  value?: number;
  onlineStatus: string;
  notes: string;
  lastUpdateDate: Date | string;
  lastUpdateBy: string;
  onlineLud?: Date | string;
}

export interface ReportStats {
  total: number;
  totalValue: number;
  avgValue: number;
  approved: number;
  rejected: number;
  pending: number;
  cancelled: number;
  totalCoinsurance: number;
}

export interface StatCard {
  title: string;
  value: number;
  icon: string;
  colorClass: string;
  subtitle: string;
  isCurrency: boolean;
}
