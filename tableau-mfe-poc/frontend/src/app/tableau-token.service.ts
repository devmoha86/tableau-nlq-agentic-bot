import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../environments/environment';

export interface TableauTokenResponse {
  token: string;
  expiresInSeconds: number;
  tokenType: string;
  issuedInMs: number;
  correlationId: string;
  siteName: string;
}

@Injectable({ providedIn: 'root' })
export class TableauTokenService {
  constructor(private readonly http: HttpClient) {}

  requestToken(): Observable<TableauTokenResponse> {
    return this.http.post<TableauTokenResponse>(
      `${environment.brokerBaseUrl}/api/tableau/token`,
      {}
    );
  }
}
