import { Injectable } from '@angular/core';
import { ApprovalDetailsDto } from '../../../shared/interfaces/approval/approval-details-dto';
import { Observable, of } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { IApiResponse, IApproval } from '../../../shared/models/approvaltodaydto';

@Injectable({
  providedIn: 'root',
})
export class Approval {
  private baseUrl = `${environment.apiUrl}Approval`;

  constructor(private http : HttpClient){}
   private approvals: ApprovalDetailsDto[] = [
    {
      comLogoUrl: 'assets/ff.jpg',
      venLogoUrl: 'assets/ff.jpg',

      from: 'Almashreq Company',
      to: 'Future Tech',

      diagnose: 'General maintenance and hardware replacement',
      branch: 'Nasr City Branch',
      copayment:20,
      printDate: new Date('2026-02-21'),
      serviceDate: new Date('2026-02-20'),
      note:'This is note',
      invoiceNo: 'INV-1001',
      clientId: '10',
      limit: 1000,
      items: [
        {
          itemId: 1,
          itemName: 'Laptop',
          quantity: 2,
          unitPrice: 100,
          maxQuantity: 2
        },
        {
          itemId: 2,
          itemName: 'Keyboard',
          quantity: 4,
          unitPrice: 40,
          maxQuantity: 4
        },
        {
          itemId: 3,
          itemName: 'sss',
          quantity: 3,
          unitPrice: 20,
          maxQuantity: 3
        }
      ]
    }
  ];


  getApprovalDetails(approvalId: number): Observable<ApprovalDetailsDto | null> {
     return of(this.approvals[0]);
  //return this.http.get<ApprovalDetailsDto>(environment.apiUrl/`${approvalId}`);
  }
  
  submitApproval(approval: ApprovalDetailsDto): Observable<{ success: boolean }> {
    console.log('Submitting approval to backend', approval);
    return of({ success: true });
    // return this.http.post<{ success: boolean }>(`${environment.apiUrl}/approval/submit`,approval);
  }
   getMemberApprovals(memberId: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/approvals/member/${memberId}`);
  }

 

}
