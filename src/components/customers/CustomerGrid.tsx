import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Grid } from "lucide-react";
import { Button } from "@/components/ui/button";

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

interface CustomerGridProps {
  customers: Customer[];
  onDelete: (customer: Customer) => void;
  onEdit: (customer: Customer) => void;
  onView?: (customer: Customer) => void;
  isDeleting?: boolean;
  isAdmin?: boolean;
  showDeleted?: boolean;
  canEditCustomer?: boolean;
  canDeleteCustomer?: boolean;
  onRestore?: (customer: Customer) => void;
  getCustomerStatus?: (customer: Customer) => string;
}

export function CustomerGrid({
  customers,
  onDelete,
  onEdit,
  onView,
  isDeleting,
  isAdmin,
  showDeleted,
  canEditCustomer,
  canDeleteCustomer,
  onRestore,
  getCustomerStatus
}: CustomerGridProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {customers.map((customer) => (
        <Card key={customer.custno}>
          <CardHeader>
            <CardTitle>{customer.custname || 'N/A'}</CardTitle>
            <CardDescription>{customer.custno}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <p>Address: {customer.address || 'N/A'}</p>
            <p>Payment Term: {customer.payterm || 'N/A'}</p>
            {isAdmin && getCustomerStatus && (
              <p>Status: {getCustomerStatus(customer)}</p>
            )}
            <div className="flex justify-between">
              {onView && (
                <Button variant="outline" size="sm" onClick={() => onView(customer)}>
                  View
                </Button>
              )}
              <div className="space-x-2">
                {onEdit && (
                  <Button variant="secondary" size="sm" onClick={() => onEdit(customer)}>
                    Edit
                  </Button>
                )}
                {onDelete && (
                  <Button variant="destructive" size="sm" onClick={() => onDelete(customer)} disabled={isDeleting}>
                    {isDeleting ? "Deleting..." : "Delete"}
                  </Button>
                )}
                {showDeleted && onRestore && (
                  <Button variant="ghost" size="sm" onClick={() => onRestore(customer)}>
                    Restore
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
