
import React from "react";
import { Button } from "@/components/ui/button";
import { ArrowUpDown, Plus } from "lucide-react";

interface CustomerTableActionsProps {
  toggleSort: (field: "custno") => void;
  showDeleted: boolean;
  setShowDeleted: (show: boolean) => void;
  prepareNewCustomerForm: () => void;
  canAddCustomer: boolean;
  isAdmin: boolean;
}

export function CustomerTableActions({
  toggleSort,
  showDeleted,
  setShowDeleted,
  prepareNewCustomerForm,
  canAddCustomer,
  isAdmin
}: CustomerTableActionsProps) {
  return (
    <div className="flex gap-2">
      <Button variant="outline" onClick={() => toggleSort("custno")}>
        <span className="mr-1">No</span>
        <ArrowUpDown size={16} />
      </Button>
      {isAdmin && (
        <Button
          variant="outline"
          onClick={() => setShowDeleted(!showDeleted)}
        >
          {showDeleted ? "Show Active" : "Show Deleted"}
        </Button>
      )}
      {canAddCustomer && (
        <Button onClick={prepareNewCustomerForm}>
          <Plus size={16} className="mr-2" /> Add Customer
        </Button>
      )}
    </div>
  );
}
