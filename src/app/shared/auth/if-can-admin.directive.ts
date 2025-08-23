import { Directive, TemplateRef, ViewContainerRef, inject, OnDestroy } from '@angular/core';
import { map, of, Subscription, switchMap } from 'rxjs';
import { CompanyService } from '../company/company.service';
import { AuthService } from './auth.service';

@Directive({ selector: '[appIfAdmin]', standalone: true })
export class IfAdminDirective implements OnDestroy {
  private readonly viewContainer = inject(ViewContainerRef);
  private readonly templateRef = inject(TemplateRef<any>);
  private readonly auth = inject(AuthService);
  private readonly company = inject(CompanyService);
  private hasView = false;
  private readonly sub = new Subscription();

  constructor() {
    const s = this.auth.authState$.pipe(
      switchMap(user => {
        const companyId = this.company.selectedCompanyId();
        if (!user || !companyId) return of(false);
        return this.company.getMyMembership$(companyId).pipe(map(m => !!m && m.role === 'admin'));
      })
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