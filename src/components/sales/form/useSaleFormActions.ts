import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { FormValues } from "./types";
import { SalesRecord } from "../types";
import { SaleItem } from "./types";
import { UseFormReturn } from "react-hook-form";

interface UseSaleFormActionsProps {
  form: UseFormReturn<FormValues>;
  saleItems: SaleItem[];
  setSaleItems: React.Dispatch<React.SetStateAction<SaleItem[]>>;
  deletedItems: SaleItem[];
  setDeletedItems: React.Dispatch<React.SetStateAction<SaleItem[]>>;
  calculateTotal: (items: SaleItem[]) => void;
  setIsSubmitting: React.Dispatch<React.SetStateAction<boolean>>;
  totalAmount: number;
  selectedSale: SalesRecord | null;
  isEditing: boolean;
  onSubmitSuccess: () => void;
}

export function useSaleFormActions({
  form,
  saleItems,
  setSaleItems,
  deletedItems,
  setDeletedItems,
  calculateTotal,
  setIsSubmitting,
  totalAmount,
  selectedSale,
  isEditing,
  onSubmitSuccess
}: UseSaleFormActionsProps) {
  const { toast } = useToast();
  const { isAdmin, permissions } = useAuth();

  const handleSubmit = async (values: FormValues) => {
    try {
      // Prevent double submission
      setIsSubmitting(true);
      
      console.log("Submitting form with values:", values);
      
      // Validate that we have at least one item with a valid product code
      if (!values.items || values.items.length === 0 || !values.items.some(item => item.prodcode)) {
        toast({
          title: "Error",
          description: "Please add at least one product to the sale.",
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }
      
      if (isEditing && selectedSale) {
        // Update existing sale
        const { error } = await supabase
          .from('sales')
          .update({
            salesdate: values.salesdate?.toISOString(),
            custno: values.custno,
            modified_at: new Date().toISOString(),
            modified_by: (await supabase.auth.getUser()).data.user?.id
          })
          .eq('transno', selectedSale.transno);
        
        if (error) {
          console.error("Error updating sale:", error);
          throw error;
        }
        
        // Only update sales details if we have permission
        if (permissions?.can_edit_salesdetails || isAdmin) {
          // Process item updates
          for (let i = 0; i < saleItems.length; i++) {
            const item = saleItems[i];
            
            // If item has an ID, it's an existing item - update it
            if (item.id) {
              const { error: updateError } = await supabase
                .from('salesdetail')
                .update({
                  prodcode: item.prodcode,
                  quantity: item.quantity
                })
                .eq('id', item.id);
                
              if (updateError) {
                console.error("Error updating sales detail:", updateError);
                throw updateError;
              }
            } else {
              // Insert new item if we have add permission
              if (permissions?.can_add_salesdetails || isAdmin) {
                const { error: insertError } = await supabase
                  .from('salesdetail')
                  .insert({
                    transno: selectedSale.transno,
                    prodcode: item.prodcode,
                    quantity: item.quantity,
                  });
                  
                if (insertError) {
                  console.error("Error inserting sales detail:", insertError);
                  throw insertError;
                }
              }
            }
          }
        }
        
        toast({
          title: "Sale Updated",
          description: `Sale #${selectedSale.transno} has been updated successfully.`,
        });
        
        // Log activity
        await supabase.rpc('log_activity', {
          action: 'update',
          table_name: 'sales',
          record_id: selectedSale.transno,
          details: JSON.stringify({...values, total_amount: totalAmount}),
        });
      } else {
        // Create new sale
        console.log("Creating new sale with values:", values);
        
        // Make sure transno is not empty
        if (!values.transno) {
          toast({
            title: "Error",
            description: "Transaction number is required.",
            variant: "destructive",
          });
          setIsSubmitting(false);
          return;
        }
        
        const { error } = await supabase
          .from('sales')
          .insert({
            transno: values.transno,
            salesdate: values.salesdate?.toISOString(),
            custno: values.custno,
          });
        
        if (error) {
          console.error("Error creating sale:", error);
          if (error.code === '23505') {
            toast({
              title: "Error",
              description: "Transaction number already exists.",
              variant: "destructive",
            });
            setIsSubmitting(false);
            return;
          }
          throw error;
        }
        
        console.log("Sale created successfully, inserting details for:", saleItems.length, "items");
        
        // Insert sale details if we have permission
        if (permissions?.can_add_salesdetails || isAdmin) {
          // Insert sale details
          if (saleItems.length > 0) {
            const detailsToInsert = saleItems
              .filter(item => item.prodcode) // Only include items with a product code
              .map(item => ({
                transno: values.transno,
                prodcode: item.prodcode,
                quantity: item.quantity,
              }));
              
            if (detailsToInsert.length > 0) {
              const { error: insertError } = await supabase
                .from('salesdetail')
                .insert(detailsToInsert);
              
              if (insertError) {
                console.error("Error inserting sale details:", insertError);
                throw insertError;
              }
            }
          }
        }
        
        toast({
          title: "Sale Created",
          description: `Sale #${values.transno} has been created successfully.`,
        });
        
        // Log activity
        await supabase.rpc('log_activity', {
          action: 'insert',
          table_name: 'sales',
          record_id: values.transno,
          details: JSON.stringify({...values, total_amount: totalAmount}),
        });
      }
      
      setIsSubmitting(false);
      onSubmitSuccess();
    } catch (error) {
      console.error('Error submitting sale:', error);
      setIsSubmitting(false);
      toast({
        title: "Error",
        description: "Failed to save sale data.",
        variant: "destructive",
      });
    }
  };

  const handleAddProduct = () => {
    // Check permission
    if (!permissions?.can_add_salesdetails && !isAdmin) {
      toast({
        title: "Permission Denied",
        description: "You don't have permission to add items.",
        variant: "destructive",
      });
      return;
    }
    
    const newItem = { prodcode: "", quantity: 1, unitprice: 0 };
    const updatedItems = [...saleItems, newItem];
    setSaleItems(updatedItems);
    
    const currentItems = form.getValues('items') || [];
    const newFormItem = { 
      prodcode: "", 
      quantity: 1, 
      deleted_at: null 
    };
    form.setValue('items', [...currentItems, newFormItem]);
  };

  const handleEditProduct = (index: number) => {
    // Check edit permission
    if (!permissions?.can_edit_salesdetails && !isAdmin) {
      toast({
        title: "Permission Denied",
        description: "You don't have permission to edit items.",
        variant: "destructive",
      });
      return;
    }
  };

  const handleRemoveProduct = (index: number) => {
    // Check permission
    if (!permissions?.can_delete_salesdetails && !isAdmin) {
      toast({
        title: "Permission Denied",
        description: "You don't have permission to delete items.",
        variant: "destructive",
      });
      return;
    }
    
    const itemToRemove = saleItems[index];
    
    // If the item has an ID, soft delete it
    if (itemToRemove.id && isEditing && selectedSale) {
      handleSoftDeleteItem(itemToRemove, index);
      return;
    }
    
    // Otherwise just remove it from the array (for new items)
    const updatedItems = [...saleItems];
    updatedItems.splice(index, 1);
    setSaleItems(updatedItems);
    
    const currentItems = form.getValues('items');
    const updatedFormItems = [...currentItems];
    updatedFormItems.splice(index, 1);
    form.setValue('items', updatedFormItems);
    
    calculateTotal(updatedItems);
  };
  
  const handleSoftDeleteItem = async (item: SaleItem, index: number) => {
    // Check permission
    if (!permissions?.can_delete_salesdetails && !isAdmin) {
      toast({
        title: "Permission Denied",
        description: "You don't have permission to delete items.",
        variant: "destructive",
      });
      return;
    }
    
    if (!item.id) return;
    
    try {
      // Update the salesdetail record with deleted_at timestamp
      const { error } = await supabase
        .from('salesdetail')
        .update({
          deleted_at: new Date().toISOString()
        })
        .eq('id', item.id);
        
      if (error) throw error;
      
      // Remove from active items
      const updatedItems = [...saleItems];
      const removedItem = updatedItems.splice(index, 1)[0];
      if (removedItem) {
        removedItem.deleted_at = new Date().toISOString();
        setDeletedItems([...deletedItems, removedItem]);
      }
      
      setSaleItems(updatedItems);
      
      // Update form values
      const currentItems = form.getValues('items');
      const updatedFormItems = [...currentItems];
      updatedFormItems.splice(index, 1);
      form.setValue('items', updatedFormItems);
      
      calculateTotal(updatedItems);
      
      toast({
        title: "Item Removed",
        description: "The item has been removed from the sale.",
      });
      
    } catch (error) {
      console.error('Error soft deleting sales detail:', error);
      toast({
        title: "Error",
        description: "Failed to remove item.",
        variant: "destructive",
      });
    }
  };
  
  const handleRestoreItem = async (item: SaleItem, index: number) => {
    // Check permission - only admins can restore items
    if (!isAdmin) {
      toast({
        title: "Permission Denied",
        description: "Only administrators can restore deleted items.",
        variant: "destructive",
      });
      return;
    }
    
    if (!item.id) return;
    
    try {
      // Update the salesdetail record, setting deleted_at to null
      const { error } = await supabase
        .from('salesdetail')
        .update({
          deleted_at: null
        })
        .eq('id', item.id);
        
      if (error) throw error;
      
      // Remove from deleted items
      const updatedDeletedItems = [...deletedItems];
      const restoredItem = updatedDeletedItems.splice(index, 1)[0];
      if (restoredItem) {
        delete restoredItem.deleted_at;
        setSaleItems([...saleItems, restoredItem]);
      }
      
      setDeletedItems(updatedDeletedItems);
      
      // Update form values
      const currentItems = form.getValues('items');
      const newItem = { 
        id: restoredItem.id,
        prodcode: restoredItem.prodcode, 
        quantity: restoredItem.quantity,
        deleted_at: null
      };
      form.setValue('items', [...currentItems, newItem]);
      
      calculateTotal([...saleItems, restoredItem]);
      
      toast({
        title: "Item Restored",
        description: "The item has been restored to the sale.",
      });
      
    } catch (error) {
      console.error('Error restoring sales detail:', error);
      toast({
        title: "Error",
        description: "Failed to restore item.",
        variant: "destructive",
      });
    }
  };

  const handleProductChange = (index: number, prodcode: string) => {
    // Check edit permission
    if (!permissions?.can_edit_salesdetails && !isAdmin && isEditing) {
      toast({
        title: "Permission Denied",
        description: "You don't have permission to edit items.",
        variant: "destructive",
      });
      return;
    }
    
    const updatedItems = [...saleItems];
    const product = updatedItems[index] || { quantity: 1, unitprice: 0 };
    updatedItems[index] = { 
      ...product, 
      prodcode 
    };
    setSaleItems(updatedItems);
    calculateTotal(updatedItems);
    
    // Update form value
    const formItems = form.getValues('items');
    if (formItems && index < formItems.length) {
      formItems[index].prodcode = prodcode;
      form.setValue('items', formItems);
    }
  };

  const handleQuantityChange = (index: number, quantity: number) => {
    // Check edit permission
    if (!permissions?.can_edit_salesdetails && !isAdmin && isEditing) {
      toast({
        title: "Permission Denied",
        description: "You don't have permission to edit items.",
        variant: "destructive",
      });
      return;
    }
    
    const updatedItems = [...saleItems];
    if (index < updatedItems.length) {
      updatedItems[index] = { ...updatedItems[index], quantity };
      setSaleItems(updatedItems);
      calculateTotal(updatedItems);
      
      // Update form value
      const formItems = form.getValues('items');
      if (formItems && index < formItems.length) {
        formItems[index].quantity = quantity;
        form.setValue('items', formItems);
      }
    }
  };

  return {
    handleSubmit,
    handleAddProduct,
    handleEditProduct,
    handleRemoveProduct,
    handleSoftDeleteItem,
    handleRestoreItem,
    handleProductChange,
    handleQuantityChange
  };
}
