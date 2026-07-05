import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
 // عدلي المسار حسب مشروعك
import { VendorOption } from '../../../shared/models/member-search';
import { BranchOption } from '../../../shared/models/member-search';
@Injectable({
  providedIn: 'root'
})
export class VendorService {
  private baseUrl = `${environment.apiUrl}/api/Vendor`;

  constructor(private http: HttpClient) {}

  filterVendorsMenu(ap_type: string, q: string, vip: boolean = false): Observable<any> {
    const params = new HttpParams()
      .set('ap_type', ap_type)
      .set('q', q)
      .set('vip', vip.toString());
    return this.http.get<any>(`${this.baseUrl}/menu`, { params });
  }

  getVendorBranches(vendorId: string): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/${vendorId}/branches`);
  }
}