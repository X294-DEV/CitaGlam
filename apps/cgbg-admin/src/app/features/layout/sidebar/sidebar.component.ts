import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { NavService } from '../../../core/services/nav.service';
import { PwaService } from '../../../core/services/pwa.service';
import { filter } from 'rxjs/operators';
import { 
  LucideAngularModule, 
  LayoutDashboard, 
  Calendar, 
  Users, 
  Scissors, 
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  ShieldCheck,
  CreditCard,
  Building,
  UserPlus,
  Package,
  Ticket,
  Palette,
  Cloud,
  FileCode,
  Scale,
  Globe,
  Zap,
  Key,
  TrendingUp,
  Server,
  Download,
  Share,
} from 'lucide-angular';
import { computed } from '@angular/core';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [
    CommonModule, 
    RouterModule, 
    LucideAngularModule
  ],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.css'
})
export class SidebarComponent implements OnInit {
  isSuperAdmin = computed(() => this.authService.currentUser()?.role === 'SUPERADMIN');

  constructor(
    public navService: NavService,
    public authService: AuthService,
    public pwaService: PwaService,
    public router: Router
  ) {}

  onLinkClick() {
    if (this.navService.isMobile()) {
      this.navService.showSidebar.set(false);
    }
  }

  isConfigOpen = signal(false);

  filteredMenuItems = computed(() => {
    const user = this.authService.currentUser();
    if (!user) return [];
    
    return [
      { icon: LayoutDashboard, label: 'Dashboard', route: '/admin/dashboard' },
      { icon: Calendar, label: 'Calendario', route: '/admin/calendar' },
      { icon: ClipboardList, label: 'Citas', route: '/admin/appointments' },
      { icon: Users, label: 'Clientes', route: '/admin/clients' },
      { icon: Scissors, label: 'Servicios', route: '/admin/services' },
      ...(user.packageFeatures?.staff !== false ? [{ icon: Users, label: 'Personal', route: '/admin/staff' }] : []),
      { icon: Settings, label: 'Negocio', route: '/admin/settings' },
      { icon: CreditCard, label: 'Suscripción', route: '/admin/subscription' },
    ];
  });

  readonly saasItems = [
    { icon: ShieldCheck, label: 'Resumen Global', route: '/admin/saas/stats' },
    { icon: Server, label: 'Balance Maestro', route: '/admin/saas/balance' },
    { icon: UserPlus, label: 'Solicitudes', route: '/admin/saas/requests' },
    { icon: Building, label: 'Negocios', route: '/admin/saas/tenants' },
    { icon: CreditCard, label: 'Pagos SaaS', route: '/admin/saas/payments' },
    { icon: Package, label: 'Planes (SaaS)', route: '/admin/saas/packages' },
    { icon: Ticket, label: 'Cupones', route: '/admin/saas/promotions' },
  ];

  readonly configSubItems = [
    { icon: Settings, label: 'General', route: '/admin/saas/config/general' },
    { icon: Palette, label: 'Identificación', route: '/admin/saas/config/identity' },
    { icon: Zap, label: 'Operaciones', route: '/admin/saas/config/operations' },
    { icon: Cloud, label: 'Servicios Cloud', route: '/admin/saas/config/cloud' },
    { icon: FileCode, label: 'Plantillas Email', route: '/admin/saas/config/templates' },
    { icon: Scale, label: 'Legal & SEO', route: '/admin/saas/config/legal' },
    { icon: Key, label: 'Integraciones API', route: '/admin/saas/config/integrations' },
  ];

  ngOnInit() {
    // Check initial URL
    this.checkConfigRoute(this.router.url);

    // Watch for route changes to keep dropdown open if needed
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      this.checkConfigRoute(event.urlAfterRedirects);
    });
  }

  private checkConfigRoute(url: string) {
    if (url.includes('/admin/saas/config')) {
      this.isConfigOpen.set(true);
    }
  }

  toggleConfig() {
    // Si está colapsado, primero expandimos el sidebar
    if (this.navService.isCollapsed()) {
      this.navService.isCollapsed.set(false);
      this.isConfigOpen.set(true);
      return;
    }
    this.isConfigOpen.update(v => !v);
  }

  toggleCollapse() {
    if (this.navService.isMobile()) {
      this.navService.showSidebar.set(false);
      return;
    }
    this.navService.toggleCollapse();
  }
}
