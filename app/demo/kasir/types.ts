export interface OrderItem {
  id: string;
  menu_name: string;
  quantity: number;
  price: number;
}

export interface Order {
  id: string;
  table_number: string;
  total_price: number;
  status: 'pending' | 'paid' | 'rejected';
  created_at: string;
  receipt_path?: string | null;
  customer_name?: string | null;
  is_ready: boolean;
  order_items: OrderItem[];
}
