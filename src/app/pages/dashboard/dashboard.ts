import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DashboardService } from '../../core/services/dashboard/dashboard-service';
import {
  AgentPerformanceDto,
  DashboardDataDto,
  DashboardTrendDto,
  ResponseReasonDto,
} from '../../shared/models/dashboard/dashboard.model';

interface AgentRow {
  name: string;
  under5: number;
  fiveToTen: number;
  over10: number;
  total: number;
}

interface ReasonBar {
  reason: string;
  count: number;
  pct: number;
  isOther: boolean;
}

type BucketKey = 'under5' | 'fiveToTen' | 'over10';

/** How many named reasons before the tail folds into "Other". */
const TOP_REASONS = 10;

@Component({
  selector: 'app-dashboard',
  imports: [CommonModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard implements OnInit {
  private readonly api = inject(DashboardService);

  // ---- KPI tiles ----
  kpiLoading = signal(true);
  kpiError = signal(false);
  data = signal<DashboardDataDto | null>(null);

  // ---- Per-chart state: each chart has its own date range (default one month) ----
  trendStart = signal(this.monthAgoStr());
  trendEnd = signal(this.todayStr());
  trendLoading = signal(true);
  trendError = signal(false);
  trend = signal<DashboardTrendDto | null>(null);

  reasonsStart = signal(this.monthAgoStr());
  reasonsEnd = signal(this.todayStr());
  reasonsLoading = signal(true);
  reasonsError = signal(false);
  reasons = signal<ResponseReasonDto[]>([]);

  agentsStart = signal(this.monthAgoStr());
  agentsEnd = signal(this.todayStr());
  agentsLoading = signal(true);
  agentsError = signal(false);
  agents = signal<AgentPerformanceDto[]>([]);

  hoveredPoint = signal<number | null>(null);
  chartTip = signal<{ x: number; y: number } | null>(null);
  agentTip = signal<{ x: number; y: number; agent: string; bucket: string; value: number } | null>(
    null
  );

  /** SVG coordinate system of the trend line chart. */
  readonly vb = { w: 760, h: 300 };
  readonly pad = { t: 18, r: 110, b: 34, l: 56 };

  /** Series colors come from the portal palette (validated for CVD separation). */
  readonly pendingColor = '#2f7fd3';
  readonly directColor = '#e8862c';

  /** Single hue for the (nominal) reasons bars; "Other" goes gray. */
  readonly reasonColor = '#12866f';
  readonly otherColor = '#8aa09a';

  /** Ordinal teal ramp: faster handling = lighter step. */
  readonly buckets: { key: BucketKey; label: string; color: string }[] = [
    { key: 'under5', label: '< 5 min', color: '#19a186' },
    { key: 'fiveToTen', label: '5–10 min', color: '#0e7360' },
    { key: 'over10', label: '> 10 min', color: '#083f35' },
  ];

  ngOnInit(): void {
    this.load();
  }

  /** Reloads everything (header refresh button). */
  load(): void {
    this.loadKpi();
    this.loadTrend();
    this.loadReasons();
    this.loadAgents();
  }

  loadKpi(): void {
    this.kpiLoading.set(true);
    this.kpiError.set(false);
    this.api.getDashboardData().subscribe({
      next: d => {
        this.data.set(d);
        this.kpiLoading.set(false);
      },
      error: () => {
        this.kpiError.set(true);
        this.kpiLoading.set(false);
      },
    });
  }

  loadTrend(): void {
    this.trendLoading.set(true);
    this.trendError.set(false);
    this.onChartLeave();
    this.api.getTrend(this.trendStart(), this.trendEnd()).subscribe({
      next: t => {
        this.trend.set(t);
        this.trendLoading.set(false);
      },
      error: () => {
        this.trendError.set(true);
        this.trendLoading.set(false);
      },
    });
  }

  loadReasons(): void {
    this.reasonsLoading.set(true);
    this.reasonsError.set(false);
    this.api.getResponseReasons(this.reasonsStart(), this.reasonsEnd()).subscribe({
      next: r => {
        this.reasons.set(r);
        this.reasonsLoading.set(false);
      },
      error: () => {
        this.reasonsError.set(true);
        this.reasonsLoading.set(false);
      },
    });
  }

  loadAgents(): void {
    this.agentsLoading.set(true);
    this.agentsError.set(false);
    this.agentTip.set(null);
    this.api.getAgentsPerformance(this.agentsStart(), this.agentsEnd()).subscribe({
      next: a => {
        this.agents.set(a);
        this.agentsLoading.set(false);
      },
      error: () => {
        this.agentsError.set(true);
        this.agentsLoading.set(false);
      },
    });
  }

  // ---- Date-range pickers ----

  setRange(chart: 'trend' | 'reasons' | 'agents', which: 'start' | 'end', ev: Event): void {
    const value = (ev.target as HTMLInputElement).value;
    if (!value) return;

    const target = {
      trend: { start: this.trendStart, end: this.trendEnd, reload: () => this.loadTrend() },
      reasons: { start: this.reasonsStart, end: this.reasonsEnd, reload: () => this.loadReasons() },
      agents: { start: this.agentsStart, end: this.agentsEnd, reload: () => this.loadAgents() },
    }[chart];

    (which === 'start' ? target.start : target.end).set(value);

    // keep start <= end
    if (target.start() > target.end()) {
      (which === 'start' ? target.end : target.start).set(value);
    }

    target.reload();
  }

  private todayStr(): string {
    return this.fmtDate(new Date());
  }

  private monthAgoStr(): string {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return this.fmtDate(d);
  }

  private fmtDate(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
      d.getDate()
    ).padStart(2, '0')}`;
  }

  // ---------------- KPI tiles ----------------

  approvalsTotal = computed(() => {
    const d = this.data();
    return d ? d.approved + d.rejected + d.deleted : 0;
  });

  approvalSegments = computed(() => {
    const d = this.data();
    if (!d) return [];
    const total = Math.max(1, this.approvalsTotal());
    return [
      { label: 'Approved', value: d.approved, color: '#199a6d' },
      { label: 'Rejected', value: d.rejected, color: '#df4646' },
      { label: 'Deleted', value: d.deleted, color: '#8aa09a' },
    ].map(s => ({ ...s, pct: (s.value / total) * 100 }));
  });

  sparkPoints = computed(() => {
    const vals = this.data()?.hourlyAvgResponse ?? [];
    if (!vals.length) return '';
    const max = Math.max(1, ...vals);
    const w = 130;
    const h = 36;
    const p = 4;
    return vals
      .map((v, i) => {
        const x = p + (i * (w - 2 * p)) / Math.max(1, vals.length - 1);
        const y = h - p - (v / max) * (h - 2 * p);
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');
  });

  sparkEnd = computed(() => {
    const pts = this.sparkPoints();
    if (!pts) return null;
    const last = pts.split(' ').pop()!.split(',');
    return { x: +last[0], y: +last[1] };
  });

  // ---------------- Trend line chart ----------------

  labels = computed(() => (this.trend()?.labels ?? []).map(l => l.trim()));

  private yMax = computed(() => {
    const t = this.trend();
    if (!t) return 1;
    return this.niceCeil(Math.max(1, ...t.pendingApprovals, ...t.directApprovals));
  });

  xFor(i: number): number {
    const n = this.labels().length;
    const plotW = this.vb.w - this.pad.l - this.pad.r;
    return n <= 1 ? this.pad.l + plotW / 2 : this.pad.l + (i * plotW) / (n - 1);
  }

  yFor(v: number): number {
    const plotH = this.vb.h - this.pad.t - this.pad.b;
    return this.pad.t + plotH * (1 - v / this.yMax());
  }

  pendingPath = computed(() => this.pathFor(this.trend()?.pendingApprovals ?? []));
  directPath = computed(() => this.pathFor(this.trend()?.directApprovals ?? []));

  private pathFor(vals: number[]): string {
    return vals
      .map((v, i) => `${i === 0 ? 'M' : 'L'} ${this.xFor(i).toFixed(1)} ${this.yFor(v).toFixed(1)}`)
      .join(' ');
  }

  yTicks = computed(() => {
    const max = this.yMax();
    const steps = 4;
    return Array.from({ length: steps + 1 }, (_, i) => {
      const v = (max / steps) * i;
      return { v, y: this.yFor(v) };
    });
  });

  xLabels = computed(() => {
    const labels = this.labels();
    const k = Math.max(1, Math.ceil(labels.length / 6));
    return labels.map((text, i) => ({ text, x: this.xFor(i), i })).filter(l => l.i % k === 0);
  });

  /** Direct labels at the line ends (nudged apart if the series converge). */
  endLabels = computed(() => {
    const t = this.trend();
    if (!t || !t.labels.length) return [];
    const i = t.labels.length - 1;
    const labels = [
      {
        text: 'Pending',
        value: t.pendingApprovals[i] ?? 0,
        color: this.pendingColor,
        y: this.yFor(t.pendingApprovals[i] ?? 0),
      },
      {
        text: 'Direct',
        value: t.directApprovals[i] ?? 0,
        color: this.directColor,
        y: this.yFor(t.directApprovals[i] ?? 0),
      },
    ];
    labels.sort((a, b) => a.y - b.y);
    if (labels[1].y - labels[0].y < 16) {
      const mid = (labels[0].y + labels[1].y) / 2;
      labels[0].y = mid - 8;
      labels[1].y = mid + 8;
    }
    return labels.map(l => ({ ...l, x: this.xFor(i) + 8 }));
  });

  onChartMove(ev: MouseEvent): void {
    const host = ev.currentTarget as HTMLElement;
    const rect = host.getBoundingClientRect();
    const n = this.labels().length;
    if (!n || !rect.width) return;
    const fx = (ev.clientX - rect.left) / rect.width;
    const l = this.pad.l / this.vb.w;
    const r = (this.vb.w - this.pad.r) / this.vb.w;
    const t = Math.max(0, Math.min(1, (fx - l) / (r - l)));
    this.hoveredPoint.set(n <= 1 ? 0 : Math.round(t * (n - 1)));
    this.chartTip.set({
      x: Math.max(8, Math.min(ev.clientX - rect.left + 14, rect.width - 175)),
      y: Math.max(8, ev.clientY - rect.top - 12),
    });
  }

  onChartLeave(): void {
    this.hoveredPoint.set(null);
    this.chartTip.set(null);
  }

  // ---------------- Response reasons ----------------

  reasonBars = computed<ReasonBar[]>(() => {
    const all = [...this.reasons()].sort((a, b) => b.count - a.count);
    if (!all.length) return [];

    const top = all.slice(0, TOP_REASONS);
    const tail = all.slice(TOP_REASONS);

    const bars: ReasonBar[] = top.map(r => ({
      reason: r.reason,
      count: r.count,
      pct: 0,
      isOther: false,
    }));

    if (tail.length) {
      bars.push({
        reason: `Other (${tail.length} reasons)`,
        count: tail.reduce((s, r) => s + r.count, 0),
        pct: 0,
        isOther: true,
      });
    }

    const max = Math.max(1, ...bars.map(b => b.count));
    return bars.map(b => ({ ...b, pct: (b.count / max) * 100 }));
  });

  // ---------------- Agents performance ----------------

  agentRows = computed<AgentRow[]>(() =>
    this.agents()
      .map(a => ({
        name: a.agent,
        under5: a.under5Min,
        fiveToTen: a.fiveToTenMin,
        over10: a.over10Min,
        total: a.under5Min + a.fiveToTenMin + a.over10Min,
      }))
      .filter(a => a.total > 0)
      .sort((a, b) => b.total - a.total)
  );

  maxAgentTotal = computed(() => Math.max(1, ...this.agentRows().map(a => a.total)));

  /** Outer bar width as % of the busiest agent. */
  barWidth(row: AgentRow): number {
    return (row.total / this.maxAgentTotal()) * 100;
  }

  /** Segment width as % of the row's own bar. */
  segWidth(row: AgentRow, key: BucketKey): number {
    return (row[key] / row.total) * 100;
  }

  onSegHover(ev: MouseEvent, row: AgentRow, bucketIdx: number): void {
    const wrap = (ev.currentTarget as HTMLElement).closest('.agents-wrap') as HTMLElement | null;
    if (!wrap) return;
    const rect = wrap.getBoundingClientRect();
    const bucket = this.buckets[bucketIdx];
    this.agentTip.set({
      agent: row.name,
      bucket: bucket.label,
      value: row[bucket.key],
      x: Math.max(8, Math.min(ev.clientX - rect.left + 12, rect.width - 185)),
      y: Math.max(4, ev.clientY - rect.top - 14),
    });
  }

  onSegLeave(): void {
    this.agentTip.set(null);
  }

  /** Rounds up to a clean axis maximum (1 / 2 / 2.5 / 5 × 10^k). */
  private niceCeil(v: number): number {
    const exp = Math.floor(Math.log10(v));
    const f = v / Math.pow(10, exp);
    const nf = f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10;
    return nf * Math.pow(10, exp);
  }
}
