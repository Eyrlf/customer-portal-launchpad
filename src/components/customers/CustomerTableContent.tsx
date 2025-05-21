
import React from "react";
import { Table, TableBody, TableCaption, TableCell, TableRow } from "@/components/ui/table";
import { CustomerTableRow } from "./CustomerTableRow";
import { CustomerTableHeader } from "./CustomerTableHeader";
import { Customer } from "./CustomerService";

interface CustomerTableContentProps {
  loading: boolean;
  filteredCustomers: Customer[];
  showDeleted: boolean;
  isAdmin: boolean;
  canEditCustomer: boolean;
  canDeleteCustomer: boolean;
  onEdit: (customer: Customer) => void;
  onDelete: (customer: Customer) => void;
  onRestore: (customer: Customer) => void;
  sortField: "custno" | "custname" | "payterm";
  sortDirection: "asc" | "desc";
  toggleSort: (field: "custno" | "custname" | "payterm") => void;
}

export function CustomerTableContent({
  loading,
  filteredCustomers,
  showDeleted,
  isAdmin,
  canEditCustomer,
  canDeleteCustomer,
  onEdit,
  onDelete,
  onRestore,
  sortField,
  sortDirection,
  toggleSort
}: CustomerTableContentProps) {
  return (
    <Table>
      <TableCaption>{loading ? 'Loading customers...' : 'List of customers.'}</TableCaption>
      
      <CustomerTableHeader 
        sortField={sortField}
        sortDirection={sortDirection}
        toggleSort={toggleSort}
      />
      
      <TableBody>
        {filteredCustomers.length === 0 && !loading ? (
          <TableRow>
            <TableCell colSpan={6} className="text-center">
              {showDeleted ? "No deleted customers found." : "No customers found."}
            </TableCell>
          </TableRow>
        ) : (
          filteredCustomers.map((customer) => (
            <CustomerTableRow 
              key={customer.custno}
              customer={customer}
              showDeleted={showDeleted}
              isAdmin={isAdmin}
              canEditCustomer={canEditCustomer}
              canDeleteCustomer={canDeleteCustomer}
              onEdit={onEdit}
              onDelete={onDelete}
              onRestore={onRestore}
            />
          ))
        )}
      </TableBody>
    </Table>
  );
}
