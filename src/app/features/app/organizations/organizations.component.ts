import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { toSignal } from '@angular/core/rxjs-interop';
import { OrganizationsService } from '../../../shared/organizations/organizations.service';
import { Organization } from '../../../shared/organizations/organizations.interfaces';
import { OrganizationFormDialogComponent } from './organization-form-dialog.component';
import { IfCanEditDirective } from '../../../shared/auth/if-can-edit.directive';
import { AgGridModule } from 'ag-grid-angular';
import { ColDef, GridApi, GridOptions, ICellRendererParams, ModuleRegistry, AllCommunityModule, themeQuartz } from 'ag-grid-community';

ModuleRegistry.registerModules([AllCommunityModule]);

@Component({
  selector: 'app-organizations',
  standalone: true,
  imports: [CommonModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule, MatDialogModule, IfCanEditDirective, AgGridModule],
  templateUrl: './organizations.component.html'
})
export class OrganizationsComponent {
  private readonly service = inject(OrganizationsService);
  private readonly dialog = inject(MatDialog);

  protected gridApi?: GridApi;
  protected readonly theme = themeQuartz;

  protected readonly search = signal('');
  protected readonly allOrganizations = toSignal(this.service.getAll$(), { initialValue: [] as Organization[] });

  protected readonly rowData = computed(() => {
    const term = this.search().toLowerCase().trim();
    const list = this.allOrganizations();
    return !term ? list : list.filter(o => (o.name?.toLowerCase().includes(term) || (o.description ?? '').toLowerCase().includes(term)));
  });

  protected readonly columnDefs: ColDef[] = [
    { field: 'name', headerName: 'Name', sortable: true, filter: true, flex: 1 },
    { field: 'description', headerName: 'Description', sortable: true, filter: true, flex: 2 },
    { headerName: 'Actions', cellRenderer: (_: ICellRendererParams) => {
        const e = document.createElement('div');
        const btn = document.createElement('button'); btn.textContent = 'Edit'; btn.className = 'mat-mdc-button'; btn.onclick = () => this.edit((_.data as Organization)); e.appendChild(btn); return e;
      }, width: 120 }
  ];

  protected readonly gridOptions: GridOptions = {
    rowModelType: 'clientSide',
    theme: themeQuartz,
    pagination: true,
    paginationPageSize: 10,
    suppressCellFocus: true,
    animateRows: true,
    defaultColDef: { sortable: true, filter: true, resizable: true }
  } as GridOptions;

  onGridReady(event: any) { this.gridApi = event.api as GridApi; this.gridApi.setGridOption('quickFilterText', this.search()); }

  add(): void { this.dialog.open(OrganizationFormDialogComponent, { width: '480px' }); }
  edit(org: Organization): void { this.dialog.open(OrganizationFormDialogComponent, { width: '480px', data: org }); }
}
