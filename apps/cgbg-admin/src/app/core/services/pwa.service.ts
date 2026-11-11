import { Injectable, signal, effect } from '@angular/core';
import { EnvironmentService } from './environment.service';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class PwaService {
  private deferredPrompt: any;
  
  showInstallButton = signal<boolean>(false);
  isIos = signal<boolean>(false);
  isInstalled = signal<boolean>(false);
  isMobile = signal<boolean>(false);

  constructor(
    private env: EnvironmentService,
    private auth: AuthService
  ) {
    console.log('[PwaService] Constructor called. Manual init mode.');
  }

  init() {
    console.log('[PwaService] init() called. Setting up PWA platform listeners.');
    this.checkPlatformStatus();
    this.initPwaEvents();
    this.checkForUpdates();
  }

  private checkPlatformStatus() {
    const userAgent = window.navigator.userAgent.toLowerCase();
    
    // In debug mode, we simulate being on mobile and iOS to see both UI elements
    if (this.env.pwaDebug()) {
      this.isIos.set(true);
      this.isMobile.set(true);
      this.isInstalled.set(false);
      this.showInstallButton.set(true);
      return;
    }

    this.isIos.set(/iphone|ipad|ipod/.test(userAgent));
    
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches 
                         || (window.navigator as any).standalone 
                         || document.referrer.includes('android-app://');
    
    this.isInstalled.set(isStandalone);
    this.isMobile.set(window.innerWidth <= 768 || /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/.test(userAgent));
  }

  private initPwaEvents() {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.deferredPrompt = e;
      
      if (this.env.pwaDebug() || (!this.isInstalled() && this.isMobile())) {
        this.showInstallButton.set(true);
      }
    });

    window.addEventListener('appinstalled', (evt) => {
      console.log('CitaGlam Admin was installed');
      this.showInstallButton.set(false);
      this.isInstalled.set(true);
      this.deferredPrompt = null;
    });
  }

  private checkForUpdates() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistration().then(reg => {
        if (reg) {
          reg.onupdatefound = () => {
            const installingWorker = reg.installing;
            if (installingWorker) {
              installingWorker.onstatechange = () => {
                if (installingWorker.state === 'installed') {
                  if (navigator.serviceWorker.controller) {
                    if (confirm('Nueva versión disponible. ¿Cargar ahora?')) {
                      window.location.reload();
                    }
                  }
                }
              };
            }
          };
        }
      });
    }
  }

  install() {
    if (!this.deferredPrompt) {
      return;
    }
    this.deferredPrompt.prompt();
    this.deferredPrompt.userChoice.then((choiceResult: any) => {
      if (choiceResult.outcome === 'accepted') {
        console.log('User accepted the install prompt');
      } else {
        console.log('User dismissed the install prompt');
      }
      this.deferredPrompt = null;
      this.showInstallButton.set(false);
    });
  }
}
