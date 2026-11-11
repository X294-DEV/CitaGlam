import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';

bootstrapApplication(App, appConfig)
  .then(() => {
    console.log('[Bootstrap] Angular Application restored successfully.');
  })
  .catch((err) => {
    console.error('[Bootstrap Error] Angular failed to start after restoration:', err);
  });
