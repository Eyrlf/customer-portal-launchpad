
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { 
  DropdownMenu, DropdownMenuContent, 
  DropdownMenuItem, DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Edit, Trash, MoreVertical, RefreshCcw } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { SalesDetailItem } from "./types";

interface SalesDetailActionsProps {
  item: SalesDetailItem;
  onEdit: () => void;
  onDelete: () => void;
  onRestore: () => void;
  showDeleted: boolean;
}

export function SalesDetailActions({ 
  item, 
  onEdit, 
  onDelete, 
  onRestore, 
  showDeleted 
}: SalesDetailActionsProps) {
  const { isAdmin, permissions } = useAuth();
  const { toast } = useToast();

  // Don't render the component if user doesn't have permissions
  if (showDeleted && !isAdmin) return null;
  
  if (!showDeleted && !isAdmin && 
      !permissions?.can_edit_salesdetails && 
      !permissions?.can_delete_salesdetails) {
    return null;
  }

  const handleEdit = () => {
    if (!permissions?.can_edit_salesdetails && !isAdmin) {
      toast({
        title: "Permission Denied",
        description: "You don't have permission to edit sales details.",
        variant: "destructive",
      });
      return;
    }
    
    onEdit();
  };

  const handleDelete = () => {
    if (!permissions?.can_delete_salesdetails && !isAdmin) {
      toast({
        title: "Permission Denied",
        description: "You don't have permission to delete sales details.",
        variant: "destructive",
      });
      return;
    }
    
    onDelete();
  };

  const handleRestore = () => {
    if (!isAdmin) {
      toast({
        title: "Permission Denied",
        description: "Only administrators can restore deleted sales details.",
        variant: "destructive",
      });
      return;
    }
    
    onRestore();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          <MoreVertical size={16} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {showDeleted ? (
          <>
            {isAdmin && (
              <DropdownMenuItem onClick={handleRestore}>
                <RefreshCcw className="mr-2 h-4 w-4" />
                Restore
              </DropdownMenuItem>
            )}
          </>
        ) : (
          <>
            {(permissions?.can_edit_salesdetails || isAdmin) && (
              <DropdownMenuItem onClick={handleEdit}>
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
            )}
            {(permissions?.can_delete_salesdetails || isAdmin) && (
              <DropdownMenuItem onClick={handleDelete}>
                <Trash className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            )}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
