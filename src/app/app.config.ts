import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { initializeApp, getApps, provideFirebaseApp } from '@angular/fire/app';
import { provideAuth, getAuth } from '@angular/fire/auth';

import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideFirebaseApp(() => {
      let app = getApps()[0];
      if (!app) {
        app = initializeApp({
          apiKey: "AIzaSyAimI4tm1-tYSyjFQKwZh67SUnqEpIybmk",
          authDomain: "revival-d96c5.firebaseapp.com",
          projectId: "revival-d96c5",
          storageBucket: "revival-d96c5.firebasestorage.app",
          messagingSenderId: "42722601299",
          appId: "1:42722601299:web:6a3fb46f6d7e094afdd9a6",
          measurementId: "G-LHJD82VFB8"
        });
      }
      return app;
    }),
    provideAuth(() => getAuth())
  ]
};
