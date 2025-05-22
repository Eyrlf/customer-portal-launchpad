
import { Button } from "@/components/ui/button";
import { 
  DropdownMenu, DropdownMenuContent, 
  DropdownMenuItem, DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/AuthContext";
import { MoreVertical, Edit, Trash, RefreshCcw } from "lucide-react";
import { SaleItem } from "./types";

interface SalesDetailActionsProps {
  item: SaleItem;
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

  // If not admin and no permissions, show disabled button
  if (!isAdmin && !permissions) {
    return (
      <Button variant="ghost" size="icon" disabled>
        <MoreVertical size={16} />
      </Button>
    );
  }

  // For deleted items, only show restore option (admin only)
  if (showDeleted) {
    if (!isAdmin) {
      return (
        <Button variant="ghost" size="icon" disabled>
          <MoreVertical size={16} />
        </Button>
      );
    }
    
    return (
      <Button 
        variant="ghost" 
        size="icon"
        onClick={onRestore}
        className="text-purple-500 hover:text-purple-700"
      >
        <RefreshCcw size={16} />
      </Button>
    );
  }

  // For regular items, show dropdown with allowed actions
  const canEdit = isAdmin || permissions?.can_edit_salesdetails;
  const canDelete = isAdmin || permissions?.can_delete_salesdetails;
  
  // If user can't perform any action, show disabled button
  if (!canEdit && !canDelete) {
    return (
      <Button variant="ghost" size="icon" disabled>
        <MoreVertical size={16} />
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          <MoreVertical size={16} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {canEdit && (
          <DropdownMenuItem onClick={onEdit}>
            <Edit className="mr-2 h-4 w-4" />
            Edit
          </DropdownMenuItem>
        )}
        {canDelete && (
          <DropdownMenuItem onClick={onDelete} className="text-destructive">
            <Trash className="mr-2 h-4 w-4" />
            Delete
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
