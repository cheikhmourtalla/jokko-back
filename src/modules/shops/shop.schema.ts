export interface ShopDetailsDTO {
  id: number;
  actorName: string;
  name: string;
  address: string | null;
  logoUrl: string | null;
  currentShop: 'PRIMARY' | 'SECONDARY';
}

