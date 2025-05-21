
// Allow for the error case in the modifier type
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
