
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { CustomerForm, CustomerFormValues } from "./CustomerForm";

interface CustomerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isEditing: boolean;
  formDefaults?: CustomerFormValues | null | undefined;
  onSubmit: (values: CustomerFormValues) => void;
}

export function CustomerDialog({
  open,
  onOpenChange,
  isEditing,
  formDefaults,
  onSubmit
}: CustomerDialogProps) {
  // Ensure formDefaults is never undefined or null and set default values
  const defaultValues: CustomerFormValues = {
    custno: formDefaults?.custno || "",
    custname: formDefaults?.custname || "",
    address: formDefaults?.address || "",
    payterm: formDefaults?.payterm || "COD"
  };
  
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
