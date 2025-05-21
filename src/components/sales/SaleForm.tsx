
import React, { useState } from "react";
import { SalesRecord, Customer } from "./types";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Form } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

// Import our new components and hooks
import { SaleFormHeader } from "./form/SaleFormHeader";
import { SaleItemList } from "./form/SaleItemList";
import { SaleSummary } from "./form/SaleSummary";
import { useSaleFormState } from "./form/useSaleFormState";
import { useSaleFormActions } from "./form/useSaleFormActions";
import { SaleFormProps } from "./form/types";

export function SaleForm({ 
  selectedSale, 
  isEditing, 
  customers, 
  onSubmitSuccess, 
  onCancel 
}: SaleFormProps) {
  const { isAdmin, permissions } = useAuth();
  const [showDeleted, setShowDeleted] = useState(false);
  
  // Initialize form state using our custom hook
  const {
    form,
    products,
    saleItems,
    setSaleItems,
    deletedItems,
    setDeletedItems,
    totalAmount,
    isSubmitting,
    setIsSubmitting,
    calculateTotal,
    editingItemIndex,
    setEditingItemIndex,
  } = useSaleFormState(selectedSale, isEditing, onSubmitSuccess);
  
  // Initialize form actions using our custom hook
  const {
    handleSubmit,
    handleAddProduct,
    handleEditProduct,
    handleRemoveProduct,
    handleRestoreItem,
    handleProductChange,
    handleQuantityChange
  } = useSaleFormActions({
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
  });

  // Only show active items by default, toggle for deleted items
  const displayedItems = showDeleted ? deletedItems : saleItems;

  return (
    <ScrollArea className="max-h-[70vh] pr-4">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          {/* Sale Header Information */}
          <SaleFormHeader form={form} customers={customers} />
          
          {/* Sale Items List */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <div className="flex gap-2">
                {isEditing && (
                  <Button 
                    type="button" 
                    variant="outline"
                    size="sm"
                    onClick={() => setShowDeleted(!showDeleted)}
                  >
                    {showDeleted ? "Show Active Items" : "Show Deleted Items"}
                  </Button>
                )}
              </div>
            </div>
            
            <SaleItemList
              items={displayedItems}
              showDeleted={showDeleted}
              products={products}
              selectedSaleTransno={selectedSale?.transno || ""}
              onAddProduct={handleAddProduct}
              onEditProduct={handleEditProduct}
              onRemoveProduct={handleRemoveProduct}
              onRestoreProduct={handleRestoreItem}
              onProductChange={handleProductChange}
              onQuantityChange={handleQuantityChange}
            />
            
            {/* Sale Total Summary */}
            <SaleSummary totalAmount={totalAmount} />
          </div>
          
          {/* Form Buttons */}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
            <Button 
              type="submit" 
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Processing...' : isEditing ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </Form>
    </ScrollArea>
  );
}
