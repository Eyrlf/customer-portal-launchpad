
import { TableCell, TableRow } from "@/components/ui/table";
import { Link } from "react-router-dom";
import { CustomerActions } from "./CustomerActions";
import { StatusBadge } from "../sales/StatusBadge";
import { getCustomerStatus } from "./CustomerService";
import { formatDate } from "../sales/utils/formatters";

interface Customer {
  custno: string;
  custname: string | null;
  address: string | null;
  payterm: string | null;
  deleted_at: string | null;
  modified_at?: string | null;
  modified_by?: string | null;
  created_at?: string | null;
  created_by?: string | null;
  action?: string; // Used to track restore action
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
}

export function CustomerTableRow({
  customer,
  showDeleted,
  isAdmin,
  canEditCustomer,
  canDeleteCustomer,
  onEdit,
  onDelete,
  onRestore
}: CustomerTableRowProps) {
  // Priority is given to the 'restore' action if present
  const status = getCustomerStatus(customer);

  return (
    <TableRow className={showDeleted ? "bg-gray-50 dark:bg-gray-700" : ""}>
      <TableCell>{customer.custno}</TableCell>
      <TableCell>
        {!showDeleted ? (
          <Link 
            to={`/dashboard/customers/${customer.custno}`}
            className="text-blue-600 hover:text-blue-800 hover:underline dark:text-blue-400 dark:hover:text-blue-300"
          >
            {customer.custname || 'N/A'}
          </Link>
        ) : (
          customer.custname || 'N/A'
        )}
      </TableCell>
      <TableCell>{customer.address || 'N/A'}</TableCell>
      <TableCell>{customer.payterm || 'N/A'}</TableCell>
      
      {/* Only show Status column for admin users */}
      {isAdmin && (
        <TableCell>
          <StatusBadge status={status} />
        </TableCell>
      )}
      
      {/* Only show Stamp column for admin users */}
      {isAdmin && (
        <TableCell className="text-xs text-gray-500">
          {customer.modified_at && (
            <div>
              Modified: {formatDate(customer.modified_at)}
              <br />
              By: {customer.modified_by || 'Unknown'}
            </div>
          )}
          {customer.deleted_at && !customer.modified_at && (
            <div>
              Deleted: {formatDate(customer.deleted_at)}
            </div>
          )}
          {!customer.deleted_at && !customer.modified_at && customer.created_at && (
            <div>
              Created: {formatDate(customer.created_at)}
              <br />
              By: {customer.created_by || 'Unknown'}
            </div>
          )}
          {!customer.deleted_at && !customer.modified_at && !customer.created_at && (
            <div>No timestamp available</div>
          )}
        </TableCell>
      )}
      
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
