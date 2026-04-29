import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApprovallsclientDTO } from '../../../shared/models/ApprovallsclientDTO';
import { ServiceResponse } from '../../../shared/models/ServiceResponse';
import { GetTodayApps } from '../../../shared/models/GetTodayApps';

@Injectable({
  providedIn: 'root',
})
export class ClientApproval {
  private  BASEURL=`${environment.apiUrl}Approval`;
  constructor(private http:HttpClient){}

  getall():Observable<ApprovallsclientDTO[]>{
    return this.http.get<ApprovallsclientDTO[]>(`${this.BASEURL}/ALL`);
  }



getalltoday(vendor_id:string|null):
Observable<ServiceResponse<GetTodayApps>> {

  return this.http.get<ServiceResponse<GetTodayApps>>(
    `${this.BASEURL}/allapprovaltoday/Ph0157`
  );
}

  getallnotcomplete(vendor_id:string|null):Observable<ApprovallsclientDTO[]>{
    return this.http.get<ApprovallsclientDTO[]>(`${this.BASEURL}/allapprovalnottoday/${vendor_id}`);
  }

  searchonapp(app:number):Observable<ApprovallsclientDTO>{
    return this.http.get<ApprovallsclientDTO>(`${this.BASEURL}/approval/${app}`);
  }
  searchonmemberID(num:number):Observable<ApprovallsclientDTO>{
    return this.http.get<ApprovallsclientDTO>(`${this.BASEURL}/number/${num}`);
  }


  add(obj:any):Observable<any>{
    return this.http.post(this.BASEURL,obj);
  }
}
