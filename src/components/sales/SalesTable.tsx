
import { useState, useEffect } from "react";
import { 
  Table, TableBody, TableCaption, TableCell, 
  TableHead, TableHeader, TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { 
  DropdownMenu, DropdownMenuContent, 
  DropdownMenuItem, DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/AuthContext";
import { Plus, Edit, Trash, MoreVertical, RefreshCcw, Eye } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle
} from "@/components/ui/dialog";
import { SalesRecord, UserPermission } from "./types";
import { formatDate, formatModifierInfo } from "./utils/formatters";
import { useSalesData } from "./hooks/useSalesData";
import { StatusBadge } from "./StatusBadge";
import { SaleForm } from "./SaleForm";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";

export function SalesTable() {
  const [showDeleted, setShowDeleted] = useState(false);
  const [selectedSale, setSelectedSale] = useState<SalesRecord | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [userPermissions, setUserPermissions] = useState<UserPermission | null>(null);
  const { isAdmin, user } = useAuth();
  const { toast } = useToast();
  
  const { 
    sales, 
    deletedSales, 
    customers, 
    employees, 
    loading, 
    fetchSales, 
    handleDelete: originalHandleDelete, 
    handleRestore: originalHandleRestore 
  } = useSalesData(showDeleted, isAdmin);

  useEffect(() => {
    if (user && !isAdmin) {
      fetchUserPermissions();
    } else if (isAdmin) {
      // Admins have all permissions
      setUserPermissions({
        id: "",
        user_id: user?.id || "",
        can_add_customers: true,
        can_edit_customers: true,
        can_delete_customers: true,
        can_add_sales: true,
        can_edit_sales: true,
        can_delete_sales: true,
        created_at: "",
        updated_at: ""
      });
    }
  }, [isAdmin, user]);

  const fetchUserPermissions = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from("user_permissions")
        .select("*")
        .eq("user_id", user.id)
        .single();
      
      if (error) {
        if (error.code !== "PGRST116") {
          // PGRST116 means no rows returned
          console.error('Error fetching user permissions:', error);
        }
        // Default to no permissions if none are set
        setUserPermissions({
          id: "",
          user_id: user.id,
          can_add_sales: false,
          can_edit_sales: false,
          can_delete_sales: false,
          can_add_customers: false,
          can_edit_customers: false,
          can_delete_customers: false,
          created_at: "",
          updated_at: ""
        });
        return;
      }
      
      if (data) {
        setUserPermissions(data as UserPermission);
      }
    } catch (error) {
      console.error('Error in fetchUserPermissions:', error);
    }
  };

  const handleEdit = (sale: SalesRecord) => {
    if (!userPermissions?.can_edit_sales && !isAdmin) {
      toast({
        title: "Permission Denied",
        description: "You don't have permission to edit sales.",
        variant: "destructive",
      });
      return;
    }
    
    setSelectedSale(sale);
    setIsEditing(true);
    setDialogOpen(true);
  };

  const handleDelete = (sale: SalesRecord) => {
    if (!userPermissions?.can_delete_sales && !isAdmin) {
      toast({
        title: "Permission Denied",
        description: "You don't have permission to delete sales.",
        variant: "destructive",
      });
      return;
    }
    
    originalHandleDelete(sale);
  };

  const handleRestore = (sale: SalesRecord) => {
    if (!isAdmin) {
      toast({
        title: "Permission Denied",
        description: "Only administrators can restore deleted sales.",
        variant: "destructive",
      });
      return;
    }
    
    originalHandleRestore(sale);
  };

  const handleFormSuccess = () => {
    setDialogOpen(false);
    fetchSales();
  };

  const getRecordStatus = (sale: SalesRecord) => {
    if (showDeleted && sale.deleted_at) return 'Deleted';
    if (sale.modified_at && !sale.deleted_at) return 'Edited';
    return 'Added';
  };

  const canAddSale = isAdmin || (userPermissions?.can_add_sales || false);
  const canEditSale = isAdmin || (userPermissions?.can_edit_sales || false);
  const canDeleteSale = isAdmin || (userPermissions?.can_delete_sales || false);

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Sales</h2>
        <div className="flex gap-2">
          {isAdmin && (
            <Button
              variant="outline"
              onClick={() => setShowDeleted(!showDeleted)}
            >
              {showDeleted ? "Hide Deleted" : "Show Deleted"}
            </Button>
          )}
          {canAddSale && (
            <Button
              onClick={() => {
                setIsEditing(false);
                setSelectedSale(null);
                setDialogOpen(true);
              }}
            >
              <Plus size={16} className="mr-2" /> Add Sale
            </Button>
          )}
        </div>
      </div>
      
      <Table>
        <TableCaption>{loading ? 'Loading sales...' : 'List of sales transactions.'}</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>Transaction No</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Total Amount</TableHead>
            <TableHead>Customer</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Stamp</TableHead>
            <TableHead className="w-[100px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {!showDeleted && sales.length === 0 && !loading ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center">No sales found.</TableCell>
            </TableRow>
          ) : showDeleted && deletedSales.length === 0 && !loading ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center">No deleted sales found.</TableCell>
            </TableRow>
          ) : (
            (showDeleted ? deletedSales : sales).map((sale) => (
              <TableRow key={sale.transno} className={showDeleted ? "bg-gray-50" : ""}>
                <TableCell>{sale.transno}</TableCell>
                <TableCell>{formatDate(sale.salesdate)}</TableCell>
                <TableCell>${sale.total_amount?.toFixed(2) || '0.00'}</TableCell>
                <TableCell>
                  {sale.customer?.custname || sale.custno || 'N/A'}
                </TableCell>
                <TableCell>
                  <StatusBadge status={getRecordStatus(sale)} />
                </TableCell>
                <TableCell className="whitespace-pre-line text-xs">
                  {formatModifierInfo(sale)}
                </TableCell>
                <TableCell>
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
                            <DropdownMenuItem onClick={() => handleRestore(sale)}>
                              <RefreshCcw className="mr-2 h-4 w-4" />
                              Restore
                            </DropdownMenuItem>
                          )}
                        </>
                      ) : (
                        <>
                          <DropdownMenuItem onClick={() => {/* View details */}}>
                            <Eye className="mr-2 h-4 w-4" />
                            View Details
                          </DropdownMenuItem>
                          {(userPermissions?.can_edit_sales || isAdmin) && (
                            <DropdownMenuItem onClick={() => handleEdit(sale)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                          )}
                          {(userPermissions?.can_delete_sales || isAdmin) && (
                            <DropdownMenuItem onClick={() => handleDelete(sale)}>
                              <Trash className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          )}
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
      
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{isEditing ? 'Edit Sale' : 'Add New Sale'}</DialogTitle>
          </DialogHeader>
          
          <SaleForm
            selectedSale={selectedSale}
            isEditing={isEditing}
            customers={customers}
            onSubmitSuccess={handleFormSuccess}
            onCancel={() => setDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
