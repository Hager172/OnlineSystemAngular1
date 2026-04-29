import { ApprovalItemDto } from "./approval-item-dto";
export interface ApprovalDetailsDto {
    comLogoUrl: string; 
    venLogoUrl: string;
    from:string;
    to:string;
    diagnose: string;
    branch: string;
    printDate: Date;
    serviceDate: Date;
    note: string;
    invoiceNo : string;
    clientId: string;
    limit: number;
    items: ApprovalItemDto[];
    copayment:number;
  

//   //client info
//   approvalNo: string;
//   note: string;
//   date: string;
//   clientName: string;
//   phone: string;
//   address: string;
//   
//   //member info
//   memberId: string;
//   memberName: string;
//   mem_phone: string;
//   companyName: string;
}
