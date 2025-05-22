
import { FormValues, SaleFormData } from "./types";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { SalesRecord, SaleItem } from "../types";
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
      
      const currentUser = (await supabase.auth.getUser()).data.user;
      const userId = currentUser?.id || null;
      
      if (isEditing && selectedSale) {
        // Check edit permission
        if (!isAdmin && !permissions?.can_edit_sales) {
          toast({
            title: "Permission Denied",
            description: "You don't have permission to edit sales.",
            variant: "destructive",
          });
          setIsSubmitting(false);
          return;
        }
        
        // Update existing sale logic
        const { error } = await supabase
          .from('sales')
          .update({
            salesdate: values.salesdate?.toISOString(),
            custno: values.custno,
            modified_at: new Date().toISOString(),
            modified_by: userId
          })
          .eq('transno', selectedSale.transno);
        
        if (error) {
          console.error("Error updating sale:", error);
          throw error;
        }

        // Update or insert sale details for editing
        for (const item of saleItems) {
          if (item.id) {
            // Update existing sale detail
            const { error: updateError } = await supabase
              .from('salesdetail')
              .update({
                quantity: item.quantity
              })
              .eq('id', item.id);
            
            if (updateError) {
              console.error("Error updating sale detail:", updateError);
              throw updateError;
            }
          } else {
            try {
              // Insert new sale detail for existing sale
              const { error: insertError } = await supabase
                .from('salesdetail')
                .insert({
                  transno: selectedSale.transno,
                  prodcode: item.prodcode,
                  quantity: item.quantity
                });
              
              if (insertError) {
                console.error("Error inserting new sale detail:", insertError);
                throw insertError;
              }
            } catch (e) {
              console.error("Error inserting new sale detail:", e);
              // Continue with other items even if one fails
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
          details: JSON.stringify({...values, total_amount: totalAmount})
        });
      } else {
        // Check add permission
        if (!isAdmin && !permissions?.can_add_sales) {
          toast({
            title: "Permission Denied",
            description: "You don't have permission to add sales.",
            variant: "destructive",
          });
          setIsSubmitting(false);
          return;
        }
        
        // Create new sale logic
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
        
        // Insert into sales table
        const { error } = await supabase
          .from('sales')
          .insert({
            transno: values.transno,
            salesdate: values.salesdate?.toISOString(),
            custno: values.custno,
            created_by: userId,
            created_at: new Date().toISOString()
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
        
        // Insert sale details for each item
        for (const item of saleItems) {
          try {
            const { error: detailError } = await supabase
              .from('salesdetail')
              .insert({
                transno: values.transno,
                prodcode: item.prodcode,
                quantity: item.quantity
              });
            
            if (detailError) {
              console.error("Error inserting sale detail:", detailError);
              // Continue with other items even if one fails
            }
          } catch (e) {
            console.error("Error inserting sale detail:", e);
            // Continue with other items even if one fails
          }
        }
        
        console.log("Sale created successfully");
        
        toast({
          title: "Sale Created",
          description: `Sale #${values.transno} has been created successfully.`,
        });
        
        // Log activity
        await supabase.rpc('log_activity', {
          action: 'insert',
          table_name: 'sales',
          record_id: values.transno,
          details: JSON.stringify({...values, total_amount: totalAmount})
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
    // Check permission to modify sales
    if (!isAdmin && !permissions?.can_edit_sales) {
      toast({
        title: "Permission Denied",
        description: "You don't have permission to modify sales.",
        variant: "destructive",
      });
      return;
    }
    
    // Default new item with empty product code and quantity of 1
    const newItem = { prodcode: "", quantity: 1, unitprice: 0, transno: selectedSale?.transno || "" } as SaleItem;
    const updatedItems = [...saleItems, newItem];
    setSaleItems(updatedItems);
    
    // Update form values with proper types
    const formItems = form.getValues('items') || [];
    form.setValue('items', [...formItems, { 
      prodcode: "", 
      quantity: 1,
      transno: selectedSale?.transno || ""
    }]);
  };

  const handleEditProduct = (index: number) => {
    // Check permission to modify sales
    if (!isAdmin && !permissions?.can_edit_sales) {
      toast({
        title: "Permission Denied",
        description: "You don't have permission to modify sales.",
        variant: "destructive",
      });
      return;
    }
    
    // Edit implementation would go here - currently not implemented as noted in the code
    console.log("Editing product at index:", index);
  };

  const handleRemoveProduct = (index: number) => {
    // Check permission to modify sales
    if (!isAdmin && !permissions?.can_delete_sales) {
      toast({
        title: "Permission Denied",
        description: "You don't have permission to delete sales.",
        variant: "destructive",
      });
      return;
    }
    
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
    if (!isAdmin && !permissions?.can_delete_sales) {
      toast({
        title: "Permission Denied",
        description: "You don't have permission to delete sales.",
        variant: "destructive",
      });
      return;
    }
    
    // Implementation would go here if soft delete is implemented
    console.log("Soft delete not implemented yet for item:", item);
  };
  
  const handleRestoreItem = async (item: SaleItem, index: number) => {
    // Only admin can restore deleted items
    if (!isAdmin) {
      toast({
        title: "Permission Denied",
        description: "Only administrators can restore deleted items.",
        variant: "destructive",
      });
      return;
    }
    
    // Implementation would go here if restore is implemented
    console.log("Restore not implemented yet for item:", item);
  };

  const handleProductChange = async (index: number, prodcode: string) => {
    const updatedItems = [...saleItems];
    const product = updatedItems[index] || { quantity: 1, unitprice: 0, transno: selectedSale?.transno || "" };
    
    // Get the product price from pricehist
    try {
      const { data, error } = await supabase
        .from('pricehist')
        .select('unitprice')
        .eq('prodcode', prodcode)
        .order('effdate', { ascending: false })
        .limit(1);
      
      if (error) throw error;
      
      const price = data && data.length > 0 ? data[0].unitprice : 0;
      
      updatedItems[index] = { 
        ...product, 
        prodcode,
        unitprice: price
      } as SaleItem;
      setSaleItems(updatedItems);
      calculateTotal(updatedItems);
      
      // Update form value
      const formItems = form.getValues('items');
      if (formItems && index < formItems.length) {
        formItems[index].prodcode = prodcode;
        form.setValue('items', formItems);
      }
    } catch (error) {
      console.error("Error getting product price:", error);
    }
  };

  const handleQuantityChange = (index: number, quantity: number) => {
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
    handleRestoreItem,
    handleProductChange,
    handleQuantityChange
  };
}
