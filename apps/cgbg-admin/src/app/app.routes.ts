import { Routes } from '@angular/router';
import { LoginComponent } from './features/auth/login/login.component';
import { SetupPasswordComponent } from './features/auth/setup-password/setup-password.component';
import { ResetPasswordComponent } from './features/auth/reset-password/reset-password.component';
import { VerifyEmailComponent } from './features/auth/verify-email/verify-email.component';
import { UploadRequestPaymentComponent } from './features/auth/upload-request-payment/upload-request-payment.component';
import { LayoutComponent } from './features/layout/layout/layout.component';
import { DashboardComponent } from './features/dashboard/dashboard.component';
import { ServicesListComponent } from './features/services/services-list/services-list.component';
import { BusinessSettingsComponent } from './features/business-settings/business-settings.component';
import { CalendarComponent } from './features/calendar/calendar.component';
import { AppointmentsListComponent } from './features/appointments/appointments-list/appointments-list.component';
import { ClientsListComponent } from './features/clients/clients-list/clients-list.component';
import { ClientDetailComponent } from './features/clients/client-detail/client-detail.component';
import { authGuard } from './core/guards/auth.guard';
import { guestGuard } from './core/guards/guest.guard';

import { SaasDashboardComponent } from './features/admin-global/saas-dashboard/saas-dashboard.component';
import { SaasTenantsComponent } from './features/admin-global/saas-tenants/saas-tenants.component';
import { SaasApprovalsComponent } from './features/admin-global/saas-approvals/saas-approvals.component';
import { SaasPackagesComponent } from './features/admin-global/saas-packages/saas-packages.component';
import { SaasPromotionsComponent } from './features/admin-global/saas-promotions/saas-promotions.component';
import { SaasRequestsComponent } from './features/admin-global/saas-requests/saas-requests.component';
import { SaasConfigComponent } from './features/admin-global/saas-config/saas-config.component';
import { SaasBalanceComponent } from './features/admin-global/saas-balance/saas-balance.component';
import { StaffListComponent } from './features/staff/staff-list/staff-list.component';
import { SubscriptionHistoryComponent } from './features/subscription/subscription-history/subscription-history.component';
import { SaasNotificationsComponent } from './features/admin-global/saas-notifications/saas-notifications.component';

export const routes: Routes = [
  { path: 'login', component: LoginComponent, canActivate: [guestGuard] },
  { path: 'auth/setup-password', component: SetupPasswordComponent, canActivate: [guestGuard] },
  { path: 'auth/reset-password', component: ResetPasswordComponent, canActivate: [guestGuard] },
  { path: 'auth/verify-email', component: VerifyEmailComponent },
  { path: 'auth/upload-payment/:id', component: UploadRequestPaymentComponent },
  { 
    path: 'admin', 
    component: LayoutComponent,
    canActivate: [authGuard],
    children: [
      { path: 'dashboard', component: DashboardComponent },
      { path: 'calendar', component: CalendarComponent },
      { path: 'appointments', component: AppointmentsListComponent },
      { path: 'services', component: ServicesListComponent },
      { path: 'clients', component: ClientsListComponent },
      { path: 'clients/:id', component: ClientDetailComponent },
      { path: 'settings', component: BusinessSettingsComponent },
      { path: 'subscription', component: SubscriptionHistoryComponent },
      { path: 'staff', component: StaffListComponent },
      
      // SaaS Global Admin routes
      { 
        path: 'saas',
        children: [
          { path: 'stats', component: SaasDashboardComponent },
          { path: 'balance', component: SaasBalanceComponent },
          { path: 'requests', component: SaasRequestsComponent },
          { path: 'tenants', component: SaasTenantsComponent },
          { path: 'payments', component: SaasApprovalsComponent },
          { path: 'packages', component: SaasPackagesComponent },
          { path: 'promotions', component: SaasPromotionsComponent },
          { path: 'notifications', component: SaasNotificationsComponent },
          { 
            path: 'config', 
            component: SaasConfigComponent,
            children: [
              { path: 'general', component: SaasConfigComponent },
              { path: 'identity', component: SaasConfigComponent },
              { path: 'operations', component: SaasConfigComponent },
              { path: 'cloud', component: SaasConfigComponent },
              { path: 'templates', component: SaasConfigComponent },
              { path: 'legal', component: SaasConfigComponent },
              { path: 'integrations', component: SaasConfigComponent },
              { path: '', redirectTo: 'general', pathMatch: 'full' }
            ]
          },
          { path: '', redirectTo: 'stats', pathMatch: 'full' }
        ]
      },
      
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
    ]
  },
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: '**', redirectTo: '/login' }
];
