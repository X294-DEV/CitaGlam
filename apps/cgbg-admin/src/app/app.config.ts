import { ApplicationConfig, LOCALE_ID, provideZonelessChangeDetection, importProvidersFrom } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { registerLocaleData } from '@angular/common';
import localeEs from '@angular/common/locales/es';

// Interceptores
import { authInterceptor } from './core/interceptors/auth.interceptor';

// Importar Lucide Angular Module
import { 
  LucideAngularModule, 
  ChevronRight, ChevronLeft, ChevronDown, ChevronUp,
  Bell, BellOff, Menu, Settings, User, LogOut,
  LayoutDashboard, Calendar, Users, Scissors,
  ClipboardList, ShieldCheck, CreditCard, Building,
  UserPlus, Package, Ticket, Palette, Cloud,
  FileCode, Scale, Globe, Zap, Key, TrendingUp,
  Server, Download, Share, Clock, ExternalLink,
  CheckCircle, Info, Send, Home, List, Plus, Trash, Edit, Save, X,
  ArrowUpRight, Activity, Target, DollarSign,
  Eye, Mail, FileText, XCircle, Layers,
  EyeOff, Edit2, PauseCircle,
  Tag, Search, Shield, Check,
  RefreshCw, History
} from 'lucide-angular';

registerLocaleData(localeEs, 'es');

export const appConfig: ApplicationConfig = {
  providers: [
    { provide: LOCALE_ID, useValue: 'es' },
    provideZonelessChangeDetection(),
    provideRouter(routes),
    provideHttpClient(
      withInterceptors([authInterceptor])
    ),
    provideAnimationsAsync(),
    importProvidersFrom(
      LucideAngularModule.pick({ 
        ChevronRight, ChevronLeft, ChevronDown, ChevronUp,
        Bell, BellOff, Menu, Settings, User, LogOut,
        LayoutDashboard, Calendar, Users, Scissors,
        ClipboardList, ShieldCheck, CreditCard, Building,
        UserPlus, Package, Ticket, Palette, Cloud,
        FileCode, Scale, Globe, Zap, Key, TrendingUp,
        Server, Download, Share, Clock, ExternalLink,
        CheckCircle, Info, Send, Home, List, Plus, Trash, Edit, Save, X,
        ArrowUpRight, Activity, Target, DollarSign,
        Eye, Mail, FileText, XCircle, Layers,
        EyeOff, Edit2, PauseCircle,
        Tag, Search, Shield, Check,
        RefreshCw, History
      })
    )
  ],
};
