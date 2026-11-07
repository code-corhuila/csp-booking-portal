import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { BillboardPage } from '../model/catalog';

@Injectable({ providedIn: 'root' })
export class CatalogApiService {
  private readonly http = inject(HttpClient);
  private readonly base = '/api/v1/catalog';

  getBillboard(page = 1, limit = 20): Observable<BillboardPage> {
    const params = new HttpParams().set('page', page).set('limit', limit);
    return this.http.get<BillboardPage>(`${this.base}/billboard`, { params });
  }
}
