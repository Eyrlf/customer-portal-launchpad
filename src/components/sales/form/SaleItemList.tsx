
import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormLabel } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";
import { Product, SaleItem } from "../types";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { SalesDetailActions } from "../SalesDetailActions";
import { useAuth } from "@/contexts/AuthContext";

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
  
  const canAddSalesDetail = isAdmin || permissions?.can_add_salesdetails;

  // Function to get product price for display
  const getProductPriceDisplay = (prodcode: string): string => {
    const product = products.find(p => p.prodcode === prodcode);
    const price = product?.unitprice || 0;
    return `$${price.toFixed(2)}`;
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-2">
        <FormLabel>Products</FormLabel>
        {!showDeleted && canAddSalesDetail && (
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
                disabled={showDeleted}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select product" />
                </SelectTrigger>
                <SelectContent>
                  {products.map((product) => (
                    <SelectItem key={product.prodcode} value={product.prodcode}>
                      {product.description} ({product.prodcode}) - ${(product.unitprice || 0).toFixed(2)}
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
                disabled={showDeleted}
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
            
            <div className="flex items-end pb-1">
              <SalesDetailActions
                item={{
                  transno: selectedSaleTransno,
                  prodcode: item.prodcode,
                  quantity: item.quantity,
                  unitprice: item.unitprice
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
