
import React from "react";
import { Table, TableBody } from "@/components/ui/table";
import { CustomerTableHeader } from "./CustomerTableHeader";
import { CustomerTableRow } from "./CustomerTableRow";
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
  if (loading) {
    return <div className="text-center p-6">Loading customers...</div>;
  }

  return (
    <div className="rounded-md border">
      <Table>
        <CustomerTableHeader 
          sortField={sortField} 
          sortDirection={sortDirection} 
          toggleSort={toggleSort}
          isAdmin={isAdmin}
        />
        
        <TableBody>
          {filteredCustomers.length === 0 ? (
            <tr>
              <td colSpan={isAdmin ? 7 : 5} className="h-24 text-center text-muted-foreground">
                No customers found.
              </td>
            </tr>
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
    </div>
  );
}
