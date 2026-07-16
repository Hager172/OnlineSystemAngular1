/** Response of GET api/Dashboard/data (see DashboardController in the backend). */
export interface DashboardDataDto {
  visitorsToday: number;
  registered: number;
  allUsers: number;
  approved: number;
  rejected: number;
  deleted: number;
  /** Average response time in minutes over the last 30 days. */
  avgResponseMinutes: number;
  /** 24 entries indexed by hour of day (0-23), 0 when no data for that hour. */
  hourlyAvgResponse: number[];
}

/** Response of GET api/Dashboard/trend?starts=&ends= */
export interface DashboardTrendDto {
  /** Day labels for ranges up to ~2 months, month labels beyond that. */
  labels: string[];
  directApprovals: number[];
  pendingApprovals: number[];
}

/** Response of GET api/Dashboard/response-reasons?starts=&ends= */
export interface ResponseReasonDto {
  reason: string;
  count: number;
}

/** Response of GET api/Dashboard/agents-performance?starts=&ends= (doctors department only). */
export interface AgentPerformanceDto {
  agent: string;
  under5Min: number;
  fiveToTenMin: number;
  over10Min: number;
}
