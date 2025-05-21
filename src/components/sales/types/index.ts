
// Define the base types for our application

export type UserModifier = {
  email: string;
  user_metadata: {
    first_name?: string;
    last_name?: string;
  };
}

export type SelectQueryErrorType = {
  error: true;
} & String;

export interface SalesRecord {
  transno: string;
  salesdate: string | null;
  custno: string | null;
  empno: string | null;
  deleted_at: string | null;
  modified_at: string | null;
  modified_by: string | null;
  customer?: {
    custname: string;
  };
  employee?: {
    firstname: string;
    lastname: string;
  };
  // Updated modifier type to handle both successful and error cases
  modifier?: UserModifier | null | SelectQueryErrorType;
  total_amount?: number;
  payment_status?: 'Paid' | 'Partial' | 'Unpaid';
}

export interface Customer {
  custno: string;
  custname: string;
  address?: string | null;
  payterm?: string | null;
  deleted_at?: string | null;
  modified_at?: string | null;
  modified_by?: string | null;
}

export interface Employee {
  empno: string;
  firstname: string;
  lastname: string;
}

// Add the Payment interface
export interface Payment {
  orno: string;
  amount: number | null;
  paydate: string | null;
  transno: string | null;
}

// Updated SalesDetailItem interface to include id and deleted_at
export interface SalesDetailItem {
  id: string;
  transno: string;
  prodcode: string;
  quantity: number;
  deleted_at?: string | null;
}

// Add the UserPermission interface
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

// Product interface
export interface Product {
  prodcode: string;
  description: string | null;
  unit: string | null;
  unitprice?: number;
}

// SaleItem interface with optional id and deleted_at
export interface SaleItem {
  id?: string;
  prodcode: string;
  quantity: number;
  unitprice: number;
  deleted_at?: string | null;
}

// Type for salesdetail items from DB
export interface SalesDetailFromDB {
  id: string;
  prodcode: string;
  quantity: number;
  transno: string;
  deleted_at?: string | null;
}
