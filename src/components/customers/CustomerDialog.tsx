
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CustomerForm, CustomerFormValues } from "./CustomerForm";

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
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Customer' : 'Add New Customer'}</DialogTitle>
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
