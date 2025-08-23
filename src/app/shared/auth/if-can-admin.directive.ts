import { Directive, TemplateRef, ViewContainerRef, inject, OnDestroy, Input } from '@angular/core';
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
  private elseTemplateRef: TemplateRef<any> | null = null;
  private lastCanView = false;

  @Input('appIfAdminElse') set appIfAdminElse(templateRef: TemplateRef<any> | null) {
    this.elseTemplateRef = templateRef;
    this.render();
  }

  constructor() {
    const s = this.auth.authState$.pipe(
      switchMap(user => {
        const companyId = this.company.selectedCompanyId();
        if (!user || !companyId) return of(false);
        return this.company.getMyMembership$(companyId).pipe(map(m => !!m && m.role === 'admin'));
      })
    ).subscribe(canView => {
      this.lastCanView = canView;
      this.render();
    });
    this.sub.add(s);
  }

  private render() {
    this.viewContainer.clear();
    if (this.lastCanView) {
      this.viewContainer.createEmbeddedView(this.templateRef);
      this.hasView = true;
    } else if (this.elseTemplateRef) {
      this.viewContainer.createEmbeddedView(this.elseTemplateRef);
      this.hasView = true;
    } else {
      this.hasView = false;
    }
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
  }
}