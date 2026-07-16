import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  AgentPerformanceDto,
  DashboardDataDto,
  DashboardTrendDto,
  ResponseReasonDto,
} from '../../../shared/models/dashboard/dashboard.model';

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly http = inject(HttpClient);

  getDashboardData(): Observable<DashboardDataDto> {
    return this.http.get<DashboardDataDto>(`${environment.apiUrl}Dashboard/data`);
  }

  /** starts/ends are local yyyy-MM-dd strings. */
  getTrend(starts: string, ends: string): Observable<DashboardTrendDto> {
    return this.http.get<DashboardTrendDto>(`${environment.apiUrl}Dashboard/trend`, {
      params: new HttpParams().set('starts', starts).set('ends', ends),
    });
  }

  getResponseReasons(starts: string, ends: string): Observable<ResponseReasonDto[]> {
    return this.http.get<ResponseReasonDto[]>(
      `${environment.apiUrl}Dashboard/response-reasons`,
      { params: new HttpParams().set('starts', starts).set('ends', ends) }
    );
  }

  getAgentsPerformance(starts: string, ends: string): Observable<AgentPerformanceDto[]> {
    return this.http.get<AgentPerformanceDto[]>(
      `${environment.apiUrl}Dashboard/agents-performance`,
      { params: new HttpParams().set('starts', starts).set('ends', ends) }
    );
  }
}
