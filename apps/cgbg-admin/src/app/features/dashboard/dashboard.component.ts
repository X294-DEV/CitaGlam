import { Component, OnInit, inject, signal, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DashboardService, DashboardMetrics, RevenueChartData, ServiceStat } from '../../core/services/dashboard.service';
import { LucideAngularModule, TrendingUp, Users, Calendar, Award, DollarSign, Activity } from 'lucide-angular';
import { Chart, registerables } from 'chart.js/auto';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit, AfterViewInit {
  private dashboardService = inject(DashboardService);
  
  metrics = signal<DashboardMetrics | null>(null);
  today = new Date();

  @ViewChild('revenueChart') revenueChartCanvas!: ElementRef;
  @ViewChild('serviceChart') serviceChartCanvas!: ElementRef;

  revenueChart?: Chart;
  serviceChart?: Chart;

  ngOnInit(): void {
    this.loadMetrics();
  }

  ngAfterViewInit(): void {
    this.loadChartData();
  }

  loadMetrics() {
    this.dashboardService.getMetrics().subscribe(m => this.metrics.set(m));
  }

  loadChartData() {
    // 1. Revenue Line Chart
    this.dashboardService.getRevenueChart().subscribe(data => {
      this.initRevenueChart(data);
    });

    // 2. Service Doughnut Chart
    this.dashboardService.getServiceStats().subscribe(data => {
      this.initServiceChart(data);
    });
  }

  initRevenueChart(data: RevenueChartData[]) {
    const ctx = this.revenueChartCanvas.nativeElement.getContext('2d');
    this.revenueChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: data.map(d => d.date),
        datasets: [{
          label: 'Ingresos Diarios',
          data: data.map(d => d.amount),
          borderColor: '#4A8E8A',
          backgroundColor: 'rgba(74, 142, 138, 0.1)',
          fill: true,
          tension: 0.4,
          pointRadius: 4,
          pointBackgroundColor: '#4A8E8A'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: { beginAtZero: true, grid: { color: '#F0F0F0' } },
          x: { grid: { display: false } }
        }
      }
    });
  }

  initServiceChart(data: ServiceStat[]) {
    const ctx = this.serviceChartCanvas.nativeElement.getContext('2d');
    this.serviceChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: data.map(d => d.name),
        datasets: [{
          data: data.map(d => d.count),
          backgroundColor: data.map(d => d.color),
          borderWidth: 0,
          hoverOffset: 10
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { usePointStyle: true, padding: 20 } }
        },
        cutout: '70%'
      }
    });
  }
}
