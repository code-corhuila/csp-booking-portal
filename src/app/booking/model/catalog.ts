export interface BillboardItem {
  movie: {
    title: string;
  };
  room: {
    name: string;
  };
  showtime: {
    id: string;
    startsAt: string;
    endsAt: string;
    priceCents: number;
  };
}

export interface BillboardPage {
  data: BillboardItem[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
