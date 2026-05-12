import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { finalize } from 'rxjs/operators';

import { environment } from '../environments/environment';
import { TableauTokenService } from './tableau-token.service';

interface MfeEvent {
  time: string;
  type: string;
  detail: string;
}

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit, OnDestroy {
  readonly environment = environment;

  @ViewChild('tableauViz', { static: false })
  set tableauVizRef(ref: ElementRef | undefined) {
    this._tableauVizRef = ref ?? null;
    if (this._tableauVizRef) {
      this.attachVizListeners();
    }
  }

  loading = true;
  errorMessage = '';
  embedToken = '';
  tokenIssuedInMs: number | null = null;
  renderDurationMs: number | null = null;
  correlationId = '';
  vizReady = false;
  worksheets: string[] = [];
  activeSheet = '';
  mfeEvents: MfeEvent[] = [];
  filterSummary = '';
  apiCallInProgress = false;

  private _tableauVizRef: ElementRef | null = null;
  private vizListenersAttached = false;
  private vizWatchdogTimer: ReturnType<typeof setTimeout> | null = null;
  private renderStart = 0;

  constructor(private readonly tokenService: TableauTokenService) {}

  ngOnInit(): void {
    this.renderStart = performance.now();
    window.addEventListener('message', this.onMessageEvent);
    this.loadToken();
  }

  ngOnDestroy(): void {
    window.removeEventListener('message', this.onMessageEvent);
    this.clearVizWatchdog();

    const viz = this.getVizElement();
    if (viz && this.vizListenersAttached) {
      viz.removeEventListener('firstinteractive', this.onVizInteractiveEvent);
      viz.removeEventListener('firstvizsizeknown', this.onVizSizeKnownEvent);
      viz.removeEventListener('vizloaderror', this.onVizLoadErrorEvent);
      viz.removeEventListener('viz-load-error', this.onVizLoadErrorEvent);
      this.vizListenersAttached = false;
    }
  }

  onFirstInteractive(): void {
    this.renderDurationMs = Math.round(performance.now() - this.renderStart);
    this.vizReady = true;
    this.logEvent('viz:ready', `First interactive in ${this.renderDurationMs} ms`);
    this.loadWorksheets();
  }

  private getVizElement(): any {
    return this._tableauVizRef?.nativeElement ?? null;
  }

  private attachVizListeners(): void {
    const viz = this.getVizElement();
    if (!viz || this.vizListenersAttached) {
      return;
    }

    viz.addEventListener('firstinteractive', this.onVizInteractiveEvent);
    viz.addEventListener('firstvizsizeknown', this.onVizSizeKnownEvent);
    viz.addEventListener('vizloaderror', this.onVizLoadErrorEvent);
    viz.addEventListener('viz-load-error', this.onVizLoadErrorEvent);
    this.vizListenersAttached = true;
    this.logEvent('viz:listener', 'Attached native tableau-viz listeners');
    this.startVizWatchdog();
  }

  private startVizWatchdog(): void {
    this.clearVizWatchdog();
    this.vizWatchdogTimer = setTimeout(() => {
      if (!this.vizReady && !this.errorMessage) {
        this.errorMessage = 'Viz did not become interactive in time. Check Tableau access, Connected App scopes, and browser console for vizloaderror.';
        this.logEvent('viz:timeout', 'No firstinteractive event within 25s');
      }
    }, 25000);
  }

  private clearVizWatchdog(): void {
    if (this.vizWatchdogTimer) {
      clearTimeout(this.vizWatchdogTimer);
      this.vizWatchdogTimer = null;
    }
  }

  async loadWorksheets(): Promise<void> {
    const viz = this.getVizElement();
    if (!viz || !viz.workbook) { return; }
    try {
      const wb = viz.workbook;
      const sheets = wb.publishedSheetsInfo as any[];
      this.worksheets = sheets.map((s: any) => s.name);
      this.activeSheet = wb.activeSheet?.name ?? '';
      this.logEvent('api:sheets', `Loaded ${this.worksheets.length} sheet(s): ${this.worksheets.join(', ')}`);
    } catch (e) {
      this.logEvent('api:error', String(e));
    }
  }

  async getFilters(): Promise<void> {
    const viz = this.getVizElement();
    if (!viz?.workbook) { return; }
    this.apiCallInProgress = true;
    try {
      const sheet = viz.workbook.activeSheet;
      const worksheets = sheet.worksheetType === 'dashboard'
        ? (sheet.worksheets as any[])
        : [sheet];
      const allFilters: string[] = [];
      for (const ws of worksheets) {
        const filters = await ws.getFiltersAsync();
        for (const f of filters) {
          allFilters.push(`${f.fieldName}: ${f.appliedValues?.map((v: any) => v.value).join(', ') || 'All'}`);
        }
      }
      this.filterSummary = allFilters.length ? allFilters.join(' | ') : 'No active filters';
      this.logEvent('api:filters', this.filterSummary);
    } catch (e) {
      this.logEvent('api:error', String(e));
    } finally {
      this.apiCallInProgress = false;
    }
  }

  async exportPdf(): Promise<void> {
    const viz = this.getVizElement();
    if (!viz) { return; }
    try {
      await viz.exportPDFAsync();
      this.logEvent('api:export', 'PDF export triggered via Embedding API v3');
    } catch (e) {
      this.logEvent('api:error', String(e));
    }
  }

  async refreshData(): Promise<void> {
    const viz = this.getVizElement();
    if (!viz) { return; }
    this.apiCallInProgress = true;
    try {
      await viz.refreshDataAsync();
      this.logEvent('api:refresh', 'Data refresh complete');
    } catch (e) {
      this.logEvent('api:error', String(e));
    } finally {
      this.apiCallInProgress = false;
    }
  }

  async switchSheet(name: string): Promise<void> {
    const viz = this.getVizElement();
    if (!viz?.workbook) { return; }
    try {
      await viz.workbook.activateSheetAsync(name);
      this.activeSheet = name;
      this.logEvent('api:navigate', `Switched to sheet: ${name}`);
    } catch (e) {
      this.logEvent('api:error', String(e));
    }
  }

  private logEvent(type: string, detail: string): void {
    const now = new Date();
    const time = now.toTimeString().slice(0, 8);
    this.mfeEvents = [{ time, type, detail }, ...this.mfeEvents].slice(0, 20);
  }

  private loadToken(): void {
    this.tokenService
      .requestToken()
      .pipe(finalize(() => {
        this.loading = false;
      }))
      .subscribe({
        next: (response) => {
          this.embedToken = response.token;
          this.tokenIssuedInMs = response.issuedInMs;
          this.correlationId = response.correlationId;
          this.errorMessage = '';
          this.vizReady = false;
          this.startVizWatchdog();
          this.logEvent('auth:token', `JWT issued in ${response.issuedInMs} ms · cid:${response.correlationId}`);
        },
        error: () => {
          this.errorMessage = 'Unable to create a secure Tableau session. Please retry.';
          this.logEvent('auth:error', 'Token request failed');
        },
      });
  }

  private onMessageEvent = (event: MessageEvent): void => {
    if (environment.allowedMessageOrigins.indexOf(event.origin) < 0) {
      return;
    }

    if (event.data && event.data.type === 'tableau-viz-load-error') {
      this.errorMessage = 'Tableau reported a load error. Check view access and token scope.';
      this.logEvent('viz:error', 'tableau-viz-load-error received');
    }
  };

  private onVizInteractiveEvent = (): void => {
    this.onFirstInteractive();
  };

  private onVizSizeKnownEvent = (): void => {
    this.logEvent('viz:size', 'firstvizsizeknown received');
  };

  private onVizLoadErrorEvent = (event: Event): void => {
    const detail = (event as CustomEvent).detail;
    const detailText = detail ? JSON.stringify(detail) : 'No detail';
    this.errorMessage = 'Tableau viz failed to load. Verify user access to the view and Connected App domain/scope settings.';
    this.logEvent('viz:error', detailText);
    this.clearVizWatchdog();
  };
}
