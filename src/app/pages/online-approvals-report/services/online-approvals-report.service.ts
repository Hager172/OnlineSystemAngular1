import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, catchError, map, throwError } from 'rxjs';
import { environment } from '../../../core/environments/environment';
import { ApprovalReportDto } from '../models/approval-report.model';

@Injectable({ providedIn: 'root' })
export class OnlineApprovalsReportService {
  private readonly http = inject(HttpClient);

  getOnlineApprovalsReport(
    clientId: string,
    starts: Date,
    ends: Date
  ): Observable<ApprovalReportDto[]> {
    // Format using local date parts — toISOString() shifts to UTC and moves the date back a day
    const fmt = (d: Date): string =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const params = new HttpParams()
      .set('starts', fmt(starts))
      .set('ends', fmt(ends));

    return this.http
      .get<unknown>(`${environment.apiUrl}Approval/online-approvals-report/${clientId}`, { params })
      .pipe(
        map(res => {
          if (Array.isArray(res)) return res as ApprovalReportDto[];
          const r = res as Record<string, unknown>;
          if (Array.isArray(r?.['data'])) return r['data'] as ApprovalReportDto[];
          return [] as ApprovalReportDto[];
        }),
        catchError(err => throwError(() => err))
      );
  }
}
