import { Injectable, signal, HostListener, PLATFORM_ID, inject, Inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Injectable({
  providedIn: 'root'
})
export class NavService {
  // State for the sidebar, managed with Angular Signals
  showSidebar = signal(true);
  isCollapsed = signal(false);
  isMobile = signal(false);

  constructor(@Inject(PLATFORM_ID) private platformId: any) {
    if (isPlatformBrowser(this.platformId)) {
      this.checkScreenSize();
    }
  }

  toggleSidebar() {
    this.showSidebar.update(v => !v);
  }

  toggleCollapse() {
    this.isCollapsed.update(v => !v);
  }

  setCollapsed(value: boolean) {
    this.isCollapsed.set(value);
  }

  checkScreenSize() {
    if (!isPlatformBrowser(this.platformId)) return;
    
    const width = window.innerWidth;
    
    // Auto-collapse on medium screens (Tablets/Laptops)
    if (width < 1024 && width >= 768) {
      this.isCollapsed.set(true);
      this.showSidebar.set(true);
      this.isMobile.set(false);
    } 
    // Show burger menu on mobile
    else if (width < 768) {
      this.showSidebar.set(false);
      this.isCollapsed.set(false);
      this.isMobile.set(true);
    } 
    // Expand on large screens
    else {
      this.isCollapsed.set(false);
      this.showSidebar.set(true);
      this.isMobile.set(false);
    }
  }
}
