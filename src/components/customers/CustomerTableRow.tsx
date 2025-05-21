
import { TableCell, TableRow } from "@/components/ui/table";
import { StatusBadge } from "../sales/StatusBadge";
import { CustomerActions } from "./CustomerActions";

interface Customer {
  custno: string;
  custname: string | null;
  address: string | null;
  payterm: string | null;
  deleted_at: string | null;
  modified_at?: string | null;
  modified_by?: string | null;
}

interface CustomerTableRowProps {
  customer: Customer;
  showDeleted: boolean;
  isAdmin: boolean;
  canEditCustomer: boolean;
  canDeleteCustomer: boolean;
  onEdit: (customer: Customer) => void;
  onDelete: (customer: Customer) => void;
  onRestore: (customer: Customer) => void;
  getCustomerStatus: (customer: Customer) => string;
}

export function CustomerTableRow({
  customer,
  showDeleted,
  isAdmin,
  canEditCustomer,
  canDeleteCustomer,
  onEdit,
  onDelete,
  onRestore,
  getCustomerStatus
}: CustomerTableRowProps) {
  return (
    <TableRow className={showDeleted ? "bg-gray-50" : ""}>
      <TableCell>{customer.custno}</TableCell>
      <TableCell>{customer.custname || 'N/A'}</TableCell>
      <TableCell>{customer.address || 'N/A'}</TableCell>
      <TableCell>{customer.payterm || 'N/A'}</TableCell>
      <TableCell>
        <StatusBadge status={getCustomerStatus(customer)} />
      </TableCell>
      <TableCell>
        <CustomerActions
          customer={customer}
          showDeleted={showDeleted}
          isAdmin={isAdmin}
          canEditCustomer={canEditCustomer}
          canDeleteCustomer={canDeleteCustomer}
          onEdit={onEdit}
          onDelete={onDelete}
          onRestore={onRestore}
        />
      </TableCell>
    </TableRow>
  );
}
