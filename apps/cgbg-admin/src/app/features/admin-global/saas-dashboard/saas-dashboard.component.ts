import { Component, OnInit, inject, signal, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SuperAdminService } from '../../../core/services/super-admin.service';
import { LucideAngularModule, Activity, Building, Users, DollarSign, Package, TrendingUp, ArrowUpRight, ArrowDownRight, Zap, Target } from 'lucide-angular';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartData, ChartType } from 'chart.js';

@Component({
  selector: 'app-saas-dashboard',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, BaseChartDirective],
  template: `
    <div class="saas-dashboard animate-fade-in">
      <header class="page-header">
        <div class="header-main">
          <h1>Soberanía Analítica</h1>
          <p>Motor de Inteligencia de Negocio del Ecosistema CitaGlam</p>
        </div>
        <div class="header-meta">
          <span class="live-indicator">
            <span class="ping"></span>
            En Tiempo Real
          </span>
        </div>
      </header>

      <!-- KPI Metrics -->
      <div class="stats-grid" *ngIf="stats() as s">
        <div class="stat-card glass-panel" *ngFor="let m of kpiMetrics(s)">
          <div class="card-icon" [ngClass]="m.color">
            <i-lucide [name]="m.icon"></i-lucide>
          </div>
          <div class="card-data">
            <span class="label">{{ m.label }}</span>
            <div class="value-group">
              <h2 class="value">{{ m.value }}</h2>
              <div class="trend" [ngClass]="m.trendType">
                <span class="trend-icon-wrapper">
                  <i-lucide [name]="m.trendIcon" class="icon-xs"></i-lucide>
                </span>
                <span class="trend-text">{{ m.trend }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Main BI Grid -->
      <div class="bi-grid" *ngIf="stats() as s">
        <!-- Revenue Trends Chart -->
        <div class="bi-card glass-panel revenue-trend-card">
          <div class="card-header">
             <div class="header-info">
               <h3>Ingresos Totales (Pipeline vs Real)</h3>
               <p>Comparativa mensual de ingresos brutos frente a pagos aprobados.</p>
             </div>
             <div class="revenue-summary">
                <div class="summary-item">
                   <div class="bullet net"></div>
                   <span>Neto: {{ s.metrics.totalRevenue | currency }}</span>
                </div>
             </div>
          </div>
          <div class="chart-container">
            <canvas baseChart
              [data]="revenueChartData"
              [options]="lineChartOptions"
              [type]="'line'">
            </canvas>
          </div>
        </div>

        <!-- Package Distribution -->
        <div class="bi-card glass-panel distribution-card">
          <div class="card-header">
            <h3>Distribución de Mercado</h3>
            <p>Popularidad de planes activos</p>
          </div>
          <div class="chart-container-doughnut">
            <canvas baseChart
              [data]="distributionChartData"
              [options]="doughnutChartOptions"
              [type]="'doughnut'">
            </canvas>
          </div>
          <div class="distribution-legend">
            <div class="legend-item" *ngFor="let d of s.packageDistribution">
               <span class="dot" [style.background]="'#4A8E8A'"></span>
               <span class="pkg-name">{{ d.name }}</span>
               <span class="pkg-count">{{ d.count }} Tenants</span>
            </div>
          </div>
        </div>

        <!-- Insights / Recent Activity -->
        <div class="bi-card glass-panel insights-card">
          <div class="card-header">
             <h3>Tendencias de Crecimiento</h3>
             <p>Nuevos registros en el último ciclo</p>
          </div>
          <div class="growth-stats">
             <div class="growth-item" *ngFor="let t of (s.revenueTrends || []).slice(-4).reverse()">
                <div class="month-box">{{ t.label }}</div>
                <div class="growth-bar-container">
                   <div class="growth-label">Nuevos Negocios</div>
                   <div class="growth-bar">
                      <div class="fill" [style.width.%]="(t.newTenants / (s.metrics.totalTenants || 1)) * 1000"></div>
                   </div>
                </div>
                <div class="growth-value">+{{ t.newTenants }}</div>
             </div>
          </div>
          <footer class="insight-footer">
             <i-lucide name="zap" class="icon-sm"></i-lucide>
             <span>Proyección positiva para el trimestre actual.</span>
          </footer>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .saas-dashboard { padding: 2rem; max-width: 1600px; margin: 0 auto; min-height: 100vh; background: #FAFCFB; }
    
    .page-header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 3rem; }
    .page-header h1 { font-family: 'Outfit', sans-serif; font-size: 2.8rem; color: #1A3E3B; font-weight: 800; margin: 0; }
    .page-header p { color: #667A78; font-size: 1.2rem; margin: 0; }

    .live-indicator { 
      display: flex; align-items: center; gap: 8px; font-size: 0.85rem; font-weight: 700; color: #4A8E8A; 
      padding: 8px 16px; background: rgba(74,142,138,0.08); border-radius: 100px;
    }
    .ping { width: 8px; height: 8px; background: #4ADE80; border-radius: 50%; position: relative; }
    .ping::after { content: ''; position: absolute; top:0; left:0; width: 100%; height: 100%; border-radius: 50%; background: #4ADE80; animation: ping 1.5s infinite; }
    @keyframes ping { 75%, 100% { transform: scale(2.5); opacity: 0; } }

    /* KPI Cards */
    .stats-grid { 
      display: grid; 
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); 
      gap: 1.25rem; 
      margin-bottom: 2rem; 
    }
    .stat-card { display: flex; align-items: center; gap: 1.25rem; padding: 1.5rem; transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1); }
    .stat-card:hover { transform: translateY(-5px); }
    
    .card-icon { width: 64px; height: 64px; border-radius: 20px; display: flex; align-items: center; justify-content: center; color: white; box-shadow: 0 10px 20px -5px rgba(0,0,0,0.1); flex-shrink: 0; }
    .card-icon.teal { background: #4A8E8A; }
    .card-icon.blue { background: #669BBC; }
    .card-icon.dark { background: #1A535C; }
    .card-icon.amber { background: #F59E0B; }

    .card-data { flex: 1; min-width: 0; }
    .label { font-size: 0.8rem; font-weight: 800; color: #99A; text-transform: uppercase; letter-spacing: 0.05em; }
    .value-group { display: flex; align-items: center; gap: 12px; margin-top: 6px; flex-wrap: wrap; }
    .value { font-family: 'Outfit', sans-serif; font-size: 2rem; font-weight: 700; color: #1A3E3B; margin: 0; }
    .trend { 
      display: inline-flex; 
      align-items: center; 
      gap: 12px; 
      font-size: 0.85rem; 
      font-weight: 800; 
      padding: 8px 20px; 
      border-radius: 100px; 
      white-space: nowrap;
      box-shadow: 0 2px 10px rgba(0,0,0,0.02);
    }
    .trend-icon-wrapper { display: flex; align-items: center; justify-content: center; width: 18px; height: 18px; }
    .trend.up { background: #E6F9F0; color: #059669; }
    .trend.neutral { background: #F3F4F6; color: #6B7280; }
    .icon-xs { width: 18px; height: 18px; flex-shrink: 0; }

    /* BI Grid */
    .bi-grid { display: grid; grid-template-columns: repeat(12, 1fr); gap: 1.5rem; }
    .bi-card { padding: 2.5rem; display: flex; flex-direction: column; height: 100%; }
    .card-header { margin-bottom: 2rem; display: flex; justify-content: space-between; align-items: flex-start; }
    .card-header h3 { font-family: 'Outfit', sans-serif; font-size: 1.4rem; color: #1A3E3B; font-weight: 700; margin: 0; }
    .card-header p { color: #889; font-size: 0.9rem; margin-top: 4px; }

    .revenue-trend-card { grid-column: span 8; }
    .chart-container { height: 350px; position: relative; }

    .revenue-summary .summary-item { display: flex; align-items: center; gap: 8px; font-size: 0.95rem; font-weight: 700; color: #1A3E3B; }
    .bullet { width: 10px; height: 10px; border-radius: 3px; }
    .bullet.net { background: #4A8E8A; }

    .distribution-card { grid-column: span 4; }
    .chart-container-doughnut { height: 250px; position: relative; }
    .distribution-legend { margin-top: 2rem; display: flex; flex-direction: column; gap: 12px; }
    .legend-item { display: flex; align-items: center; gap: 12px; font-size: 0.9rem; }
    .dot { width: 8px; height: 8px; border-radius: 50%; }
    .pkg-name { flex: 1; font-weight: 600; color: #445; }
    .pkg-count { font-weight: 800; color: #1A3E3B; }

    .insights-card { grid-column: span 12; }
    .growth-stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 2rem; }
    .growth-item { display: flex; align-items: center; gap: 1.5rem; }
    .month-box { background: #F0F7F6; padding: 12px; border-radius: 12px; font-weight: 800; color: #4A8E8A; width: 60px; text-align: center; }
    .growth-bar-container { flex: 1; }
    .growth-label { font-size: 0.75rem; font-weight: 700; color: #AAA; margin-bottom: 6px; }
    .growth-bar { height: 8px; background: #F0F0F0; border-radius: 10px; overflow: hidden; }
    .growth-bar .fill { height: 100%; background: #4A8E8A; border-radius: 10px; }
    .growth-value { font-weight: 800; color: #1A3E3B; font-size: 1.2rem; }

    .insight-footer { margin-top: 2.5rem; display: flex; align-items: center; gap: 10px; padding: 16px; background: #FFF9E6; border-radius: 16px; color: #854D0E; font-size: 0.9rem; font-weight: 600; }
    .icon-sm { width: 18px; height: 18px; }

    .glass-panel { background: white; border-radius: 32px; border: 1px solid #F0F5F2; box-shadow: 0 4px 30px rgba(0,0,0,0.02); }

    @media (max-width: 1200px) {
      .revenue-trend-card, .distribution-card { grid-column: span 12; }
    }

    @media (max-width: 768px) {
      .saas-dashboard { padding: 1.25rem; }
      .page-header { flex-direction: column; align-items: flex-start; gap: 1rem; margin-bottom: 2rem; }
      .page-header h1 { font-size: 2rem; }
      
      .bi-card { padding: 1.5rem; }
      .chart-container { height: 280px; }
      .chart-container-doughnut { height: 220px; }
      
      .stats-grid { grid-template-columns: 1fr; }
      .stat-card { padding: 1.25rem; gap: 1rem; }
      .card-icon { width: 50px; height: 50px; border-radius: 16px; }
      .card-icon i-lucide { width: 24px; height: 24px; }
      .value { font-size: 1.6rem; }
      
      .growth-stats { grid-template-columns: 1fr; gap: 1.25rem; }
      .growth-item { gap: 1rem; }
      .month-box { width: 50px; padding: 10px; font-size: 0.85rem; }
    }
  `]
})
export class SaasDashboardComponent implements OnInit {
  private saasService = inject(SuperAdminService);
  stats = signal<any>(null);

  // Revenue Chart Configuration
  public revenueChartData: ChartData<'line'> = {
    datasets: [],
    labels: []
  };

  public lineChartOptions: ChartConfiguration<'line'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    elements: {
      line: { tension: 0.4 },
      point: { radius: 6, hitRadius: 10, hoverRadius: 8, backgroundColor: '#FFF', borderWidth: 3 }
    },
    scales: {
      y: { grid: { display: false }, ticks: { font: { size: 11 } } },
      x: { grid: { display: false }, ticks: { font: { size: 11 } } }
    },
    plugins: {
      legend: { display: false },
      tooltip: { 
        backgroundColor: '#1A3E3B', padding: 12, cornerRadius: 12, titleFont: { size: 14, weight: 'bold' },
        callbacks: { label: (c: any) => ` $${c.formattedValue}` }
      }
    }
  };

  // Distribution Chart
  public distributionChartData: ChartData<'doughnut'> = {
    datasets: [],
    labels: []
  };

  public doughnutChartOptions: ChartConfiguration<'doughnut'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '75%',
    plugins: {
      legend: { display: false }
    }
  };

  ngOnInit() {
    this.saasService.getGlobalStats().subscribe(s => {
      if (s) {
        this.stats.set(s);
        this.prepareCharts(s);
      }
    });
  }

  kpiMetrics(s: any) {
    return [
      { label: 'Negocios Totales', value: s.metrics.totalTenants, icon: 'building', color: 'teal', trend: '+12%', trendType: 'up', trendIcon: 'arrow-up-right' },
      { label: 'Tenants Activos', value: s.metrics.activeTenants, icon: 'activity', color: 'blue', trend: 'Sano', trendType: 'neutral', trendIcon: 'target' },
      { label: 'Ingresos SaaS', value: `$${s.metrics.totalRevenue.toLocaleString()}`, icon: 'dollar-sign', color: 'dark', trend: '+8.4%', trendType: 'up', trendIcon: 'arrow-up-right' },
      { label: 'Audit. Pendiente', value: s.metrics.pendingPayments, icon: 'package', color: 'amber', trend: 'Acción req.', trendType: 'neutral', trendIcon: 'zap' }
    ];
  }

  private prepareCharts(s: any) {
    if (!s || !s.revenueTrends || !s.packageDistribution) return;

    // 1. Revenue Line Chart (Dual: Net vs Gross)
    this.revenueChartData = {
      labels: s.revenueTrends.map((t: any) => t.label),
      datasets: [
        {
          data: s.revenueTrends.map((t: any) => t.gross),
          label: 'Pipeline Bruto',
          borderColor: '#E0EDE8',
          backgroundColor: 'rgba(224, 237, 232, 0.2)',
          fill: true,
          pointBorderColor: '#A0B3AC'
        },
        {
          data: s.revenueTrends.map((t: any) => t.net),
          label: 'Ingresos Netos',
          borderColor: '#4A8E8A',
          backgroundColor: 'rgba(74, 142, 138, 0.1)',
          fill: true,
          borderWidth: 4,
          pointBorderColor: '#4A8E8A'
        }
      ]
    };

    // 2. Package Distribution Doughnut
    this.distributionChartData = {
      labels: s.packageDistribution.map((d: any) => d.name),
      datasets: [{
        data: s.packageDistribution.map((d: any) => d.count),
        backgroundColor: ['#4A8E8A', '#1A535C', '#669BBC', '#F59E0B', '#FAD02C'],
        hoverOffset: 10,
        borderWidth: 0
      }]
    };
  }
}
