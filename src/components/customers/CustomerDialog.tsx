
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { CustomerForm, CustomerFormValues } from "./CustomerForm";
import { useEffect } from "react";

interface CustomerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isEditing: boolean;
  formDefaults: CustomerFormValues;
  onSubmit: (values: CustomerFormValues) => void;
}

export function CustomerDialog({
  open,
  onOpenChange,
  isEditing,
  formDefaults,
  onSubmit
}: CustomerDialogProps) {
  // Ensure the default payment term is set
  const defaultValues = {
    ...formDefaults,
    payterm: formDefaults.payterm || "COD", // Set default payment term if not provided
  };
  
  // Clean the input data to ensure it fits within database constraints
  useEffect(() => {
    if (open && defaultValues.custname && defaultValues.custname.length > 20) {
      defaultValues.custname = defaultValues.custname.substring(0, 20);
    }
    
    if (open && defaultValues.address && defaultValues.address.length > 50) {
      defaultValues.address = defaultValues.address.substring(0, 50);
    }
  }, [open, defaultValues]);
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Customer' : 'Add New Customer'}</DialogTitle>
          <DialogDescription>
            {isEditing ? 'Update customer details below.' : 'Enter customer details to create a new record.'}
          </DialogDescription>
        </DialogHeader>
        
        <CustomerForm
          defaultValues={defaultValues}
          onSubmit={onSubmit}
          onCancel={() => onOpenChange(false)}
          isEditing={isEditing}
        />
      </DialogContent>
    </Dialog>
  );
}
