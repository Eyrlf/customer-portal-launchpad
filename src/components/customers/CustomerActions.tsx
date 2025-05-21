
import { Button } from "@/components/ui/button";
import { 
  DropdownMenu, DropdownMenuContent, 
  DropdownMenuItem, DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { MoreVertical, Edit, Trash2, RefreshCcw, Eye } from "lucide-react";
import { Customer } from "./CustomerService";
import { useToast } from "@/hooks/use-toast";

interface CustomerActionsProps {
  customer: Customer;
  onDelete: (customer: Customer) => void;
  onEdit: (customer: Customer) => void;
  showDeleted?: boolean;
  isAdmin?: boolean;
  canEditCustomer?: boolean;
  canDeleteCustomer?: boolean;
  onRestore?: (customer: Customer) => void;
  isDeleting?: boolean;
  onView?: (customer: Customer) => void;
}

export function CustomerActions({
  customer,
  onDelete,
  onEdit,
  showDeleted = false,
  isAdmin = false,
  canEditCustomer = false,
  canDeleteCustomer = false,
  onRestore,
  isDeleting = false,
  onView
}: CustomerActionsProps) {
  const { toast } = useToast();

  const handleDelete = () => {
    if (!canDeleteCustomer && !isAdmin) {
      toast({
        title: "Permission Denied",
        description: "You don't have permission to delete customers.",
        variant: "destructive"
      });
      return;
    }
    
    onDelete(customer);
  };

  const handleEdit = () => {
    if (!canEditCustomer && !isAdmin) {
      toast({
        title: "Permission Denied",
        description: "You don't have permission to edit customers.",
        variant: "destructive"
      });
      return;
    }
    
    onEdit(customer);
  };

  const handleRestore = () => {
    if (!isAdmin || !onRestore) {
      toast({
        title: "Permission Denied",
        description: "Only admins can restore deleted customers.",
        variant: "destructive"
      });
      return;
    }
    
    onRestore(customer);
  };

  const handleView = () => {
    if (onView) {
      onView(customer);
    }
  };

  // If showing deleted items, only admins can restore
  if (showDeleted) {
    if (!isAdmin) {
      return null;
    }
    
    return (
      <Button 
        variant="outline" 
        size="sm"
        onClick={handleRestore}
        className="text-purple-500 hover:text-purple-700 hover:bg-purple-50"
        disabled={isDeleting}
      >
        <RefreshCcw className="mr-2 h-4 w-4" /> Restore
      </Button>
    );
  }

  // If user has no permissions, show just view button if available
  if (!canEditCustomer && !canDeleteCustomer && !isAdmin) {
    return onView ? (
      <Button variant="outline" size="sm" onClick={handleView}>
        <Eye className="mr-2 h-4 w-4" /> View
      </Button>
    ) : null;
  }

  return (
    <div className="flex justify-end">
      {onView && (
        <Button variant="ghost" size="sm" onClick={handleView} className="mr-2">
          <Eye className="h-4 w-4" />
        </Button>
      )}
      
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {(canEditCustomer || isAdmin) && (
            <DropdownMenuItem onClick={handleEdit}>
              <Edit className="mr-2 h-4 w-4" /> Edit
            </DropdownMenuItem>
          )}
          {(canDeleteCustomer || isAdmin) && (
            <DropdownMenuItem 
              onClick={handleDelete}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" /> Delete
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
