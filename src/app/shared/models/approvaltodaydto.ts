// models/approval.model.ts
export interface IApproval {
  id: number;
  approval_date: string; // أو Date حسب اللي جاي من API
  memberid: string;
  membername: string;
  apptype: string; // ده اللي هيحدد completed ولا not complete
  note: string;
}

// للـ API Response
export interface IApiResponse<T> {
  status: number;
  message?: string;
  data?: T;
}