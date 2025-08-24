import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { toSignal } from '@angular/core/rxjs-interop';
import { EventsService } from '../../../shared/events/events.service';
import { AppEvent } from '../../../shared/events/events.interfaces';
import { EventFormDialogComponent } from './event-form-dialog.component';
import { AgGridModule } from 'ag-grid-angular';
import { ColDef, GridApi, GridOptions, ICellRendererParams, ModuleRegistry, AllCommunityModule, themeQuartz } from 'ag-grid-community';

ModuleRegistry.registerModules([AllCommunityModule]);

@Component({
  selector: 'app-events',
  standalone: true,
  imports: [CommonModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule, MatDialogModule, AgGridModule],
  templateUrl: './events.component.html'
})
export class EventsComponent {
  private readonly service = inject(EventsService);
  private readonly dialog = inject(MatDialog);

  protected gridApi?: GridApi;
  protected readonly theme = themeQuartz;

  protected readonly search = signal('');
  protected readonly allEvents = toSignal(this.service.getAll$(), { initialValue: [] as AppEvent[] });

  protected readonly rowData = computed(() => {
    const term = this.search().toLowerCase().trim();
    return this.allEvents().filter(e => !term || e.name?.toLowerCase().includes(term) || (e.description ?? '').toLowerCase().includes(term));
  });

  protected readonly columnDefs: ColDef[] = [
    { field: 'name', headerName: 'Name', sortable: true, filter: true, flex: 1 },
    { field: 'description', headerName: 'Description', sortable: true, filter: true, flex: 2 },
    { field: 'costUSD', headerName: 'Cost (USD)', sortable: true, filter: 'agNumberColumnFilter', valueFormatter: p => (p.value ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }), width: 140 },
    { headerName: 'Actions', cellRenderer: (_: ICellRendererParams) => {
        const e = document.createElement('div');
        const btn = document.createElement('button'); btn.textContent = 'Edit'; btn.className = 'mat-mdc-button'; btn.onclick = () => this.edit((_.data as AppEvent)); e.appendChild(btn); return e;
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

  add(): void { this.dialog.open(EventFormDialogComponent, { width: '480px' }); }
  edit(evt: AppEvent): void { this.dialog.open(EventFormDialogComponent, { width: '480px', data: evt }); }
}