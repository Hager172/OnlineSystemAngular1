import { Injectable } from '@angular/core';
import { Approval } from '../../../shared/interfaces/approval/approval';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { map, Observable } from 'rxjs';
import { IApiResponse, IApproval } from '../../../shared/models/approvaltodaydto';
import { ClaimDto, CreateClaimResponseDto, ProductLookupDto } from '../../../shared/models/create-claim/create-claim.model';
import { DiagnosisDto } from '../../../shared/models/create-claim/DiagnosisDto';

@Injectable({
  providedIn: 'root'
})
export class ApprovalService {
  private baseUrl = `${environment.apiUrl}`;
  constructor(private http: HttpClient){}
  private mockApprovals: Record<string, Approval> = {
    'APR-001': {
      approvalNumber: 'APR-001',
      date: '2026-02-20',
      notes: 'Standard approval for medical equipment and supplies',
      diagnose: 'Post-surgery rehabilitation equipment',
      companyName: 'MediCare Solutions Inc.',
      companyLogo: 'https://images.unsplash.com/photo-1599305445671-ac291c95aaa9?w=200&h=80&fit=crop',
      vendorLogo: 'https://images.unsplash.com/photo-1560179707-f14e90ef3623?w=200&h=80&fit=crop',
      branch: 'Main Branch - Downtown',
      invoiceNumber: 'INV-2026-001',
      issueDate: '2026-02-23',
      serviceDate: '2026-02-25',
      clientName: 'John Smith',
      clientId: 'CLT-12345',
      clientPhone: '+1 (555) 987-6543',
      limit: 1000.00,
      copaymentPercentage: 10,
      extraCopaymentPercentage: 20,
      items: [
        {
          id: '1',
          description: 'Wheelchair - Standard Model',
          quantity: 1,
          quantityUnit: 'Unit',
          unitPrice: 450.00,
        },
        {
          id: '2',
          description: 'Walking Cane - Adjustable',
          quantity: 2,
          quantityUnit: 'Unit',
          unitPrice: 35.00,
        },
        {
          id: '3',
          description: 'Blood Pressure Monitor',
          quantity: 1,
          quantityUnit: 'Unit',
          unitPrice: 85.00,
        },
      ],
    },
    'APR-002': {
      approvalNumber: 'APR-002',
      date: '2026-02-21',
      notes: 'Urgent approval for dental procedures and treatment',
      diagnose: 'Multiple dental restorations required',
      companyName: 'Dental Care Plus',
      companyLogo: 'https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?w=200&h=80&fit=crop',
      vendorLogo: 'https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=200&h=80&fit=crop',
      branch: 'North Branch',
      invoiceNumber: 'INV-2026-002',
      issueDate: '2026-02-23',
      serviceDate: '2026-02-26',
      clientName: 'Sarah Johnson',
      clientId: 'CLT-67890',
      clientPhone: '+1 (555) 876-5432',
      limit: 3000.00,
      copaymentPercentage: 15,
      extraCopaymentPercentage: 25,
      items: [
        {
          id: '1',
          description: 'Dental Crown - Porcelain',
          quantity: 2,
          quantityUnit: 'Unit',
          unitPrice: 800.00,
        },
        {
          id: '2',
          description: 'Root Canal Treatment',
          quantity: 1,
          quantityUnit: 'Session',
          unitPrice: 1200.00,
        },
      ],
    },
    'APR-003': {
      approvalNumber: 'APR-003',
      date: '2026-02-22',
      notes: 'Physical therapy equipment and supplies approval',
      diagnose: 'Lower back pain treatment and rehabilitation',
      companyName: 'PhysioHealth Partners',
      companyLogo: 'https://images.unsplash.com/photo-1504813184591-01572f98c85f?w=200&h=80&fit=crop',
      vendorLogo: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=200&h=80&fit=crop',
      branch: 'South Branch',
      invoiceNumber: 'INV-2026-003',
      issueDate: '2026-02-23',
      serviceDate: '2026-02-27',
      clientName: 'Michael Brown',
      clientId: 'CLT-11223',
      clientPhone: '+1 (555) 765-4321',
      limit: 500.00,
      copaymentPercentage: 10,
      extraCopaymentPercentage: 30,
      items: [
        {
          id: '1',
          description: 'Resistance Bands Set',
          quantity: 3,
          quantityUnit: 'Set',
          unitPrice: 45.00,
        },
        {
          id: '2',
          description: 'Exercise Ball - Large',
          quantity: 2,
          quantityUnit: 'Unit',
          unitPrice: 30.00,
        },
        {
          id: '3',
          description: 'TENS Unit - Professional Grade',
          quantity: 1,
          quantityUnit: 'Unit',
          unitPrice: 350.00,
        },
      ],
    },
  };

  getApproval(approvalNumber: string): Observable<Approval> {
    console.log("approvalnum",approvalNumber);
  return this.getApprovalDetails(approvalNumber).pipe(
    map(res => this.mapApprovalDetailsToApproval(res))
  );
}
getApprovalView(approvalNumber: string): Observable<Approval> {
    console.log("approvalnum",approvalNumber);
  return this.getApprovalViewDetails(approvalNumber).pipe(
    map(res => this.mapApprovalDetailsToApproval(res))
  );
}
getApprovalPrint(approvalNumber: string): Observable<Approval> {
    console.log("approvalnum",approvalNumber);
  return this.getApprovalPrintDetails(approvalNumber).pipe(
    map(res => this.mapApprovalDetailsToApproval(res))
  );
}
getApprovalsearchDetails(approvalNumber: string): Observable<any> {
  return this.http.get<any>(`${this.baseUrl}Approval/${approvalNumber}/searchdetails`);
}


  approvalExists(approvalNumber: string): boolean {
    // return !!this.mockApprovals[approvalNumber];
    return !!this.getApprovalDetails(approvalNumber);

  }

  saveEditedItems(approvalNumber: string, items: any): void {
    sessionStorage.setItem(`approval-${approvalNumber}`, JSON.stringify(items));
  }

  getEditedItems(approvalNumber: string): any {
    const stored = sessionStorage.getItem(`approval-${approvalNumber}`);
    return stored ? JSON.parse(stored) : null;
  }
 getMemberApprovals(memberId: string): Observable<any> {
  

    return this.http.get(`${this.baseUrl}Approval/approvals/member/${memberId}`);
  }
 getMemberInfo(memberId: string,type: string): Observable<any> {
  
    return this.http.get(`${this.baseUrl}Approval/member-info?memberId=${memberId}&type=${type}`);
  }
  getApprovalDetails(id: string): Observable<any> {
  return this.http.get<any>(`${this.baseUrl}Approval/${id}/details`);
}
 getApprovalViewDetails(id: string): Observable<any> {
  return this.http.get<any>(`${this.baseUrl}Approval/${id}/view`);
}

 getApprovalPrintDetails(id: string): Observable<any> {
  return this.http.get<any>(`${this.baseUrl}Approval/${id}/print`);
}


mapApprovalDetailsToApproval(apiRes: any): Approval {
  console.log('Mapping API to Approval:', apiRes);
  return {
    approvalNumber: apiRes.approvalId?.toString() || '',
    date: apiRes.approvalDate || new Date().toISOString(),
    companyName: apiRes.vendorName || 'Unknown Company',
    companyLogo: apiRes.clientImage || apiRes.companyLogo || '',
    vendorLogo: apiRes.vendorImage || apiRes.vendorLogo || '',
    branch: apiRes.v_branch_id || 'Main Branch',
    invoiceNumber: apiRes.approvalId?.toString() || '',
    serviceDate: apiRes.approvalDate || '',
    clientName: apiRes.memberName || '',
    clientId: apiRes.memberId || '',
    diagnose: apiRes.diagnoses?.map((d: any) => d.name).join(', ') || '',
    notes: apiRes.notes || '',
    limit: apiRes.maxValue || null,
    // نسبة التحمل (coinsurance): تؤخذ من أول خدمة، وإن لم توجد فمن رأس الموافقة
    copaymentPercentage: apiRes.services?.[0]?.coinsurance ?? apiRes.coinsurance ?? 0,
    extraCopaymentPercentage: 0,
    items: (apiRes.services || []).map((s: any) => ({
      description: s.itemDesc || '',
      quantity: s.apQty || s.qty || 0,
      quantityUnit: s.doseUnits?.toString() || 'Unit',
      unitPrice: s.price || 0,
      name: s.servicename || '',
      copayment: s.coinsurance ?? 0,
    })),
  };
}


 getTodayCompletedApprovals(clientid: string,vendorId:string): Observable<any> {
    return this.http.get<any>(
      `${this.baseUrl}Approval/allapprovaltoday/${clientid}/${vendorId}`
    );
  }

  getTodayNotCompletedApprovals(clientid: string,vendorId:string): Observable<any> {
    return this.http.get<any>(
      `${this.baseUrl}Approval/allapprovalnottoday/${clientid}/${vendorId}`
    );
  }


   createClaim(
    claim: ClaimDto,
    files: File[] = []
  ): Observable<CreateClaimResponseDto> {

    // الباك إند بيستقبل IFormFileCollection فلازم نبعت multipart/form-data مش JSON
    const formData = new FormData();
    formData.append('MembId', claim.membId);
    formData.append('ServiceDate', claim.serviceDate.toISOString());
    formData.append('PresId', claim.presId);
    if (claim.phone) formData.append('Phone', claim.phone);
    if (claim.diagnosisString) formData.append('DiagnosisString', claim.diagnosisString);
    if (claim.diagnosisInsString) formData.append('DiagnosisInsString', claim.diagnosisInsString);
    if (claim.notes) formData.append('Notes', claim.notes);
    if (claim.nationalId) formData.append('NationalId', claim.nationalId);

    claim.services.forEach((s, i) => {
      formData.append(`Services[${i}].ProductId`, String(s.productId));
      formData.append(`Services[${i}].Qty`, String(s.qty));
      formData.append(`Services[${i}].Price`, String(s.price));
      formData.append(`Services[${i}].Units`, String(s.units));
      formData.append(`Services[${i}].Rep`, String(s.rep));
      formData.append(`Services[${i}].Duration`, String(s.duration));
    });

    files.forEach(f => formData.append('Files', f, f.name));

    return this.http.post<CreateClaimResponseDto>(
      this.baseUrl + 'Approval/create',
      formData
    );
  }


createRequestClaim(claim: ClaimDto, files: File[] = []) {
  // نفس الإندبوينت بقى بيستقبل form-data فبنمرر على createClaim
  return this.createClaim(claim, files);
}

getDiagnosis(term: string) {
  return this.http.get<DiagnosisDto[]>(
    `${this.baseUrl}Approval/diagnosis`,
    {
      params: {
        term: term
      }
    }
  );
}

getProducts(term: string, vtype: string) {
  return this.http.get<ProductLookupDto[]>(
    `${this.baseUrl}Approval/products?term=${term}&vtype=${vtype}`
  );
}




getbranchapprovals(branchid: string, starts?: string, ends?: string): Observable<any> {
  let url = `${this.baseUrl}Approval/branch-approvals?office_id=${branchid}`;
  if (starts) url += `&starts=${encodeURIComponent(starts)}`;
  if (ends) url += `&ends=${encodeURIComponent(ends)}`;
  return this.http.get<any>(url);
}


getbrancha3mpprovals(branchid: string): Observable<any> {
  return this.http.get<any>(
    `${this.baseUrl}Approval/monthlycliams?office_id=${branchid}`
  );}

  cancelApproval(approvalId: number): Observable<any> {
  return this.http.put(
    `${this.baseUrl}Approval/cancelapproval/${approvalId}`,
    {}
  );
}
editApproval(request: any): Observable<any> {
  return this.http.post<any>(
    `${this.baseUrl}Approval/edit`,
    request
  );
}
getAgentProducts(term: string, vendorId: string) {
  return this.http.get<ProductLookupDto[]>(
    `${this.baseUrl}Approval/Agentproducts?term=${term}&vendor_id=${vendorId}`
  );
}
/**
 * Runs the ported ACMS SubmitApproval(approval, srvs) validations (member status, balance, ...)
 * and, like the legacy EditApproval, can also send `diagnosis` (replaces approval_diagnose)
 * and `files` (attachments saved under the approval).
 * Only approvalId is required — omitted approval fields / an empty srvs list fall back
 * to what is stored in the database for that approval.
 */
submitApproval(
  approvalId: string | number,
  options: {
    approval?: any;
    srvs?: any[];
    diagnosis?: string[];
    files?: File[];
  } = {}
): Observable<{ status: boolean; msg: string; error_type: string }> {
  // الباك إند بيستقبل [FromForm] عشان الملفات، فلازم multipart/form-data
  const formData = new FormData();

  formData.append('Approval.ApprovalId', String(Number(approvalId)));

  Object.entries(options.approval ?? {}).forEach(([key, value]) => {
    if (value !== null && value !== undefined) {
      formData.append(`Approval.${key}`, String(value));
    }
  });

  (options.srvs ?? []).forEach((s, i) => {
    Object.entries(s ?? {}).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        formData.append(`Srvs[${i}].${key}`, String(value));
      }
    });
  });

  (options.diagnosis ?? []).forEach((d) => formData.append('Diagnosis', d));

  (options.files ?? []).forEach((f) => formData.append('Attach', f, f.name));

  return this.http.post<{ status: boolean; msg: string; error_type: string }>(
    `${this.baseUrl}Claims/submit`,
    formData
  );
}

getMemberCareItems(memberId: string) {
  return this.http.get<any>(
    `${this.baseUrl}Approval/GetMemberCareItems?member_id=${memberId}`
  );
}

getCoinsuranceOfMedItem(memberId: string, careItemId: number) {
  return this.http.get<any>(
    `${this.baseUrl}Approval/getcoinsuranceofmeditem`,
    { params: { memid: memberId, meditem: careItemId } }
  );
}
}