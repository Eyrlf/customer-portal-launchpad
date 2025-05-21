
import React from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormLabel } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";
import { SalesDetailItem, Product, SaleItem } from "../types";
import { SalesDetailActions } from "../SalesDetailActions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

interface SaleItemListProps {
  items: SaleItem[];
  showDeleted: boolean;
  products: Product[];
  selectedSaleTransno: string;
  onAddProduct: () => void;
  onEditProduct: (index: number) => void;
  onRemoveProduct: (index: number) => void;
  onRestoreProduct: (item: SaleItem, index: number) => void;
  onProductChange: (index: number, prodcode: string) => void;
  onQuantityChange: (index: number, quantity: number) => void;
}

export function SaleItemList({
  items,
  showDeleted,
  products,
  selectedSaleTransno,
  onAddProduct,
  onEditProduct,
  onRemoveProduct,
  onRestoreProduct,
  onProductChange,
  onQuantityChange
}: SaleItemListProps) {
  const { isAdmin, permissions } = useAuth();
  const canAddItems = permissions?.can_add_salesdetails || isAdmin;
  const canEditItems = permissions?.can_edit_salesdetails || isAdmin;
  const canDeleteItems = permissions?.can_delete_salesdetails || isAdmin;

  return (
    <div>
      <div className="flex justify-between items-center mb-2">
        <FormLabel>Products</FormLabel>
        {!showDeleted && canAddItems && (
          <Button 
            type="button" 
            variant="outline" 
            size="sm" 
            onClick={onAddProduct}
          >
            <Plus size={16} className="mr-2" /> Add Product
          </Button>
        )}
      </div>
      
      {!canEditItems && !canAddItems && !canDeleteItems && !showDeleted && (
        <Alert className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            You don't have permissions to modify sales details. You can only view them.
          </AlertDescription>
        </Alert>
      )}
      
      {items.length === 0 ? (
        <div className="text-center py-4 text-gray-500">
          {showDeleted ? "No deleted items found." : "No items added yet."}
        </div>
      ) : (
        items.map((item, index) => (
          <div key={index} className="flex gap-2 mb-3 items-end">
            <div className="flex-grow space-y-2">
              <FormLabel className="text-xs">Product</FormLabel>
              <Select
                value={item.prodcode}
                onValueChange={(value) => onProductChange(index, value)}
                disabled={showDeleted || !canEditItems}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select product" />
                </SelectTrigger>
                <SelectContent>
                  {products.map((product) => (
                    <SelectItem key={product.prodcode} value={product.prodcode}>
                      {product.description} ({product.prodcode}) - ${product.unitprice?.toFixed(2)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="w-20 space-y-2">
              <FormLabel className="text-xs">Qty</FormLabel>
              <Input
                type="number"
                min="1"
                value={item.quantity}
                onChange={(e) => onQuantityChange(index, parseInt(e.target.value) || 1)}
                disabled={showDeleted || !canEditItems}
              />
            </div>
            
            <div className="w-20 space-y-2">
              <FormLabel className="text-xs">Price</FormLabel>
              <Input
                type="text"
                value={`$${item.unitprice.toFixed(2)}`}
                disabled
              />
            </div>
            
            <div className="mb-1">
              <SalesDetailActions
                item={{
                  id: item.id || "",
                  transno: selectedSaleTransno,
                  prodcode: item.prodcode,
                  quantity: item.quantity,
                  deleted_at: item.deleted_at
                }}
                onEdit={() => onEditProduct(index)}
                onDelete={() => onRemoveProduct(index)}
                onRestore={() => onRestoreProduct(item, index)}
                showDeleted={showDeleted}
              />
            </div>
          </div>
        ))
      )}
    </div>
  );
}
