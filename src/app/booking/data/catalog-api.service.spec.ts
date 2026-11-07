import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { CatalogApiService } from './catalog-api.service';

describe('CatalogApiService', () => {
  let service: CatalogApiService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [CatalogApiService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(CatalogApiService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('reads the public billboard with pagination', () => {
    service.getBillboard(2, 10).subscribe();

    const request = http.expectOne((candidate) =>
      candidate.url === '/api/v1/catalog/billboard'
      && candidate.params.get('page') === '2'
      && candidate.params.get('limit') === '10',
    );
    expect(request.request.method).toBe('GET');
    request.flush({ data: [], meta: { page: 2, limit: 10, total: 0, totalPages: 0 } });
  });
});
