
import { Button } from "@/components/ui/button";
import { 
  DropdownMenu, DropdownMenuContent, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { MoreVertical } from "lucide-react";
import { SalesDetailItem } from "./types";

interface SalesDetailActionsProps {
  item: SalesDetailItem;
  onEdit: () => void;
  onDelete: () => void;
  onRestore: () => void;
  showDeleted: boolean;
}

// This component now just shows a dropdown icon without any actions
export function SalesDetailActions({ 
  item,
  onEdit, 
  onDelete, 
  onRestore, 
  showDeleted 
}: SalesDetailActionsProps) {
  // Empty dropdown just for visual consistency
  return (
    <Button variant="ghost" size="icon" disabled>
      <MoreVertical size={16} />
    </Button>
  );
}
