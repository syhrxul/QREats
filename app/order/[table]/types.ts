export interface MenuItem {
  id: string;
  name: string;
  price: number;
  image_url: string | null;
  is_available: boolean;
  description?: string | null;
  category?: string | null;
}

export interface CartItem extends MenuItem {
  qty: number;
}
