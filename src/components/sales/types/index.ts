export interface SalesDetailItem {
  transno: string;
  prodcode: string;
  quantity: number;
  unitprice: number;
}

// Make sure UserPermission includes salesdetails permissions
export interface UserPermission {
  id: string;
  user_id: string;
  can_add_customers: boolean;
  can_edit_customers: boolean;
  can_delete_customers: boolean;
  can_add_sales: boolean;
  can_edit_sales: boolean;
  can_delete_sales: boolean;
  can_add_salesdetails: boolean;
  can_edit_salesdetails: boolean;
  can_delete_salesdetails: boolean;
  created_at: string;
  updated_at: string;
}

export interface SalesRecord {
  transno: string;
  salesdate: string | null;
  custno: string | null;
  total_amount?: number | null;
  created_at: string;
  created_by: string | null;
  modified_at: string | null;
  modified_by: string | null;
  deleted_at: string | null;
  deleted_by: string | null;
  customer?: Customer;
}

export interface Customer {
  custno: string;
  custname: string | null;
  address: string | null;
  city: string | null;
  phone: string | null;
}

export interface Employee {
  empno: string;
  empname: string | null;
  position: string | null;
}

export interface Product {
  prodcode: string;
  description: string | null;
  unitprice: number | null;
  unit: string | null;
}

export interface SaleItem {
  prodcode: string;
  quantity: number;
  unitprice: number;
}

export interface Payment {
  orno: string;
  transno: string;
  paydate: string | null;
  amount: number | null;
}
