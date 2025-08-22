import { Directive, TemplateRef, ViewContainerRef, inject, OnDestroy } from '@angular/core';
import { AuthService } from './auth.service';
import { map, of, Subscription, switchMap } from 'rxjs';

@Directive({ selector: '[appIfAdmin]', standalone: true })
export class IfAdminDirective implements OnDestroy {
  private readonly viewContainer = inject(ViewContainerRef);
  private readonly templateRef = inject(TemplateRef<any>);
  private readonly auth = inject(AuthService);
  private hasView = false;
  private readonly sub = new Subscription();

  constructor() {
    const s = this.auth.authState$.pipe(
      switchMap(user => (user ? (this.auth.getUserProfile$(user.uid) as any) : of(null))),
      map((profile: any) => ((profile?.role as string) ?? 'viewer') === 'admin')
    ).subscribe(canView => this.updateView(canView));
    this.sub.add(s);
  }

  private updateView(canView: boolean) {
    if (canView && !this.hasView) {
      this.viewContainer.createEmbeddedView(this.templateRef);
      this.hasView = true;
    } else if (!canView && this.hasView) {
      this.viewContainer.clear();
      this.hasView = false;
    }
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
  }
}