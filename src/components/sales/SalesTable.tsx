import { useState, useEffect, useMemo } from "react";
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
import { Plus, Edit, Trash2, MoreVertical, RefreshCcw, Eye } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle
} from "@/components/ui/dialog";
import { SalesRecord, UserPermission } from "./types";
import { formatDate, formatModifierInfoSync } from "./utils/formatters";
import { useSalesData } from "./hooks/useSalesData";
import { StatusBadge } from "./StatusBadge";
import { SaleForm } from "./SaleForm";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { Link, useNavigate } from "react-router-dom";

interface SalesTableProps {
  statusFilter?: string;
  searchQuery?: string;
  sortOrder?: "asc" | "desc";
}

export function SalesTable({ statusFilter = "all", searchQuery = "", sortOrder = "desc" }: SalesTableProps) {
  const [showDeleted, setShowDeleted] = useState(false);
  const [selectedSale, setSelectedSale] = useState<SalesRecord | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [userPermissions, setUserPermissions] = useState<UserPermission | null>(null);
  const { isAdmin, user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const { 
    sales: allSales, 
    deletedSales: allDeletedSales, 
    customers, 
    employees, 
    loading, 
    fetchSales, 
    handleDelete,
    handleRestore
  } = useSalesData(showDeleted, isAdmin);

  // Filter sales based on status and search query
  const filteredSales = useMemo(() => {
    let filtered = [...allSales];
    
    // Apply status filter if not set to 'all'
    if (statusFilter !== "all") {
      filtered = filtered.filter(sale => {
        const status = getRecordStatus(sale).toLowerCase();
        return status === statusFilter.toLowerCase();
      });
    }
    
    // Apply search filter if query exists
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(sale => 
        sale.transno.toLowerCase().includes(query) || 
        sale.customer?.custname?.toLowerCase().includes(query) ||
        (sale.total_amount?.toString().includes(query))
      );
    }
    
    // Sort by transaction number
    filtered.sort((a, b) => {
      if (sortOrder === "asc") {
        return a.transno.localeCompare(b.transno);
      } else {
        return b.transno.localeCompare(a.transno);
      }
    });
    
    return filtered;
  }, [allSales, statusFilter, searchQuery, sortOrder]);

  // Filter deleted sales based on search query
  const filteredDeletedSales = useMemo(() => {
    let filtered = [...allDeletedSales];
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(sale => 
        sale.transno.toLowerCase().includes(query) || 
        sale.customer?.custname?.toLowerCase().includes(query) ||
        (sale.total_amount?.toString().includes(query))
      );
    }
    
    // Sort by transaction number
    filtered.sort((a, b) => {
      if (sortOrder === "asc") {
        return a.transno.localeCompare(b.transno);
      } else {
        return b.transno.localeCompare(a.transno);
      }
    });
    
    return filtered;
  }, [allDeletedSales, searchQuery, sortOrder]);

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
          can_add_customers: false,
          can_edit_customers: false,
          can_delete_customers: false,
          can_add_sales: false,
          can_edit_sales: false,
          can_delete_sales: false,
          created_at: "",
          updated_at: ""
        } as UserPermission);
        return;
      }
      
      if (data) {
        // Add new properties with default values if they don't exist in the data
        setUserPermissions({
          ...data,
          // Ensure all required fields are present
          can_add_customers: data.can_add_customers !== undefined ? data.can_add_customers : false,
          can_edit_customers: data.can_edit_customers !== undefined ? data.can_edit_customers : false,
          can_delete_customers: data.can_delete_customers !== undefined ? data.can_delete_customers : false,
          can_add_sales: data.can_add_sales !== undefined ? data.can_add_sales : false,
          can_edit_sales: data.can_edit_sales !== undefined ? data.can_edit_sales : false,
          can_delete_sales: data.can_delete_sales !== undefined ? data.can_delete_sales : false,
          created_at: data.created_at || "",
          updated_at: data.updated_at || ""
        } as UserPermission);
      }
    } catch (error) {
      console.error('Error in fetchUserPermissions:', error);
    }
  };

  const handleViewDetails = (sale: SalesRecord) => {
    navigate(`/dashboard/sales/${sale.transno}`);
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

  const handleFormSuccess = () => {
    setDialogOpen(false);
    fetchSales();
  };

  const getRecordStatus = (sale: SalesRecord) => {
    if (sale.deleted_at) return 'Deleted';
    
    if (sale.modified_by !== null && sale.modified_at !== null) {
      return 'Edited';
    }

    if (sale.deleted_at !== null && sale.deleted_by === null) {
      return 'Restored';
    }
    
    return 'Added';
  };

  const canAddSale = isAdmin || (userPermissions?.can_add_sales || false);
  const canEditSale = isAdmin || (userPermissions?.can_edit_sales || false);
  const canDeleteSale = isAdmin || (userPermissions?.can_delete_sales || false);

  const displayedSales = showDeleted ? filteredDeletedSales : filteredSales;

  return (
    <div className="bg-white rounded-lg shadow dark:bg-gray-800">
      <div className="flex justify-between items-center p-4 border-b">
        <h2 className="text-lg font-medium">Transactions</h2>
        <div className="flex gap-2">
          {isAdmin && (
            <Button
              variant="outline"
              onClick={() => setShowDeleted(!showDeleted)}
            >
              {showDeleted ? "Show Active" : "Show Deleted"}
            </Button>
          )}
        </div>
      </div>
      
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Transaction No</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Total Amount</TableHead>
            <TableHead>Customer</TableHead>
            {/* Only show Status and Stamp columns for admin users */}
            {isAdmin && (
              <>
                <TableHead>Status</TableHead>
                <TableHead>Stamp</TableHead>
              </>
            )}
            <TableHead className="w-[100px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {displayedSales.length === 0 && !loading ? (
            <TableRow>
              <TableCell colSpan={isAdmin ? 7 : 5} className="text-center">
                {showDeleted ? "No deleted sales found." : "No sales found."}
              </TableCell>
            </TableRow>
          ) : (
            displayedSales.map((sale) => (
              <TableRow key={sale.transno} className={showDeleted ? "bg-gray-50 dark:bg-gray-700" : ""}>
                <TableCell>
                  {!showDeleted ? (
                    <Link 
                      to={`/dashboard/sales/${sale.transno}`}
                      className="text-blue-600 hover:text-blue-800 hover:underline dark:text-blue-400 dark:hover:text-blue-300"
                    >
                      {sale.transno}
                    </Link>
                  ) : (
                    sale.transno
                  )}
                </TableCell>
                <TableCell>{formatDate(sale.salesdate)}</TableCell>
                <TableCell>${sale.total_amount?.toFixed(2) || '0.00'}</TableCell>
                <TableCell>
                  {sale.customer ? (
                    <Link 
                      to={`/dashboard/customers/${sale.custno}`}
                      className="text-blue-600 hover:text-blue-800 hover:underline dark:text-blue-400 dark:hover:text-blue-300"
                    >
                      {sale.customer.custname || sale.custno || 'N/A'}
                    </Link>
                  ) : (
                    sale.custno || 'N/A'
                  )}
                </TableCell>
                {/* Only show Status and Stamp columns for admin users */}
                {isAdmin && (
                  <>
                    <TableCell>
                      <StatusBadge status={getRecordStatus(sale)} />
                    </TableCell>
                    <TableCell className="whitespace-pre-line text-xs">
                      {formatModifierInfoSync(sale)}
                    </TableCell>
                  </>
                )}
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
                          <DropdownMenuItem onClick={() => handleViewDetails(sale)}>
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
                              <Trash2 className="mr-2 h-4 w-4" />
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
