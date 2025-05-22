
export interface Customer {
  custno: string;
  custname: string | null;
  address: string | null;
  city: string | null;
  phone: string | null;
  payterm: string | null;
}

export interface Employee {
  empno: string;
  firstname: string | null;
  lastname: string | null;
  empname: string | null;
  position: string | null;
}

export interface UserData {
  email?: string;
  user_metadata?: {
    first_name?: string;
    last_name?: string;
  };
}

export interface SaleItem {
  id?: number;
  transno: string;
  prodcode: string;
  quantity: number;
  unitprice?: number;
  product?: {
    prodcode: string;
    description: string | null;
    unit: string | null;
  };
  deleted_at?: string | null;
  deleted_by?: string | null;
}

export interface SalesRecord {
  transno: string;
  salesdate: string | null;
  custno: string | null;
  empno: string | null;
  total_amount?: number;
  payment_status?: 'Paid' | 'Partial' | 'Unpaid';
  customer?: Customer | null;
  employee?: Employee;
  deleted_at: string | null;
  deleted_by: string | null;
  created_at: string | null;
  created_by: string | null;
  modified_at: string | null;
  modified_by: string | null;
  modifier?: UserData | null;
  action?: string; // Used to track restore action
}

export interface UserPermission {
  id: string;
  user_id: string;
  can_add_customers: boolean;
  can_edit_customers: boolean;
  can_delete_customers: boolean;
  can_add_sales: boolean;
  can_edit_sales: boolean;
  can_delete_sales: boolean;
  created_at: string;
  updated_at: string;
}

export interface DashboardStats {
  total_sales: number;
  total_revenue: number;
  recent_sales: SalesRecord[];
  top_customers: {
    customer: Customer;
    total_purchases: number;
    total_amount: number;
  }[];
}

export interface SaleFormData {
  transno: string;
  salesdate: Date | undefined;
  custno: string;
  items: SaleItem[];
}

export interface Product {
  prodcode: string;
  description: string | null;
  unit: string | null;
  unitprice?: number;
}

export interface SalesDetailItem {
  id?: number;
  transno: string;
  prodcode: string;
  quantity: number;
  unitprice?: number;
  product?: Product;
  deleted_at?: string | null;
  deleted_by?: string | null;
}

export interface SalesDetailFromDB {
  transno: string;
  prodcode: string;
  quantity: number;
  deleted_at: string | null;
  deleted_by: string | null;
}
