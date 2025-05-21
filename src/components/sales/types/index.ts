
export interface SalesDetailItem {
  transno: string;
  prodcode: string;
  quantity: number;
  unitprice: number;
}

// Updated SalesDetailFromDB interface to include deleted_at and deleted_by fields
export interface SalesDetailFromDB {
  id?: string;
  transno: string;
  prodcode: string;
  quantity: number;
  deleted_at?: string | null;
  deleted_by?: string | null;
  product?: Product;
  unitprice?: number;
}

// Updated UserPermission interface to include salesdetails permissions
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

// Updated Customer interface to better match the DB schema
// Making fields that might be missing in some scenarios optional
export interface Customer {
  custno: string;
  custname: string | null;
  address: string | null;
  // The following properties may not exist in the DB but are needed for TypeScript
  city: string | null;
  phone: string | null;
  payterm?: string | null;
}

// Updated SalesRecord to accommodate the actual data structure from DB
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
  empno?: string | null;
  payment_status?: 'Paid' | 'Partial' | 'Unpaid';
  customer?: Customer | null;
  employee?: Employee;
  modifier?: {
    email?: string;
    user_metadata?: {
      first_name?: string;
      last_name?: string;
    };
    error?: string;
  } | null;
}

// Updated Employee interface
export interface Employee {
  empno: string;
  empname?: string | null;
  position?: string | null;
  firstname?: string | null;
  lastname?: string | null;
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
