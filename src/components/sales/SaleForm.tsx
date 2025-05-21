
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { SalesRecord, Customer, SalesDetailItem } from "./types";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { format } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, Plus, Trash, RefreshCcw } from "lucide-react";
import {
  DialogFooter
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SalesDetailActions } from "./SalesDetailActions";

interface Product {
  prodcode: string;
  description: string | null;
  unit: string | null;
  unitprice?: number;
}

interface SaleFormProps {
  selectedSale: SalesRecord | null;
  isEditing: boolean;
  customers: Customer[];
  onSubmitSuccess: () => void;
  onCancel: () => void;
}

// Updated SaleItem to match the database structure and include id and deleted_at
interface SaleItem {
  id?: string;
  prodcode: string;
  quantity: number;
  unitprice: number;
  deleted_at?: string | null;
}

// Updated form schema with proper fields including deleted_at
const formSchema = z.object({
  transno: z.string().min(1, "Transaction number is required"),
  salesdate: z.date().nullable(),
  custno: z.string().nullable(),
  items: z.array(
    z.object({
      id: z.string().optional(),
      prodcode: z.string().min(1, "Product is required"),
      quantity: z.number().min(1, "Quantity must be at least 1"),
      deleted_at: z.string().nullable().optional(),
    })
  ),
});

// This type is derived from the schema for form values
type FormValues = z.infer<typeof formSchema>;

export function SaleForm({ 
  selectedSale, 
  isEditing, 
  customers, 
  onSubmitSuccess, 
  onCancel 
}: SaleFormProps) {
  const { toast } = useToast();
  const { isAdmin, permissions } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [saleItems, setSaleItems] = useState<SaleItem[]>([]);
  const [deletedItems, setDeletedItems] = useState<SaleItem[]>([]);
  const [showDeleted, setShowDeleted] = useState(false);
  const [totalAmount, setTotalAmount] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null);
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      transno: "",
      salesdate: null,
      custno: null,
      items: [],
    },
  });

  useEffect(() => {
    fetchProducts();
    if (selectedSale && isEditing) {
      form.reset({
        transno: selectedSale.transno,
        salesdate: selectedSale.salesdate ? new Date(selectedSale.salesdate) : null,
        custno: selectedSale.custno,
        items: [],
      });
      fetchSaleDetails(selectedSale.transno);
    } else if (!isEditing) {
      generateNewTransactionNumber();
      form.reset({
        transno: "",
        salesdate: new Date(),
        custno: null,
        items: [],
      });
      setSaleItems([]);
      setDeletedItems([]);
    }
  }, [selectedSale, isEditing, form]);

  const generateNewTransactionNumber = async () => {
    try {
      // Get the highest transaction number
      const { data, error } = await supabase
        .from('sales')
        .select('transno')
        .order('transno', { ascending: false })
        .limit(1);
      
      if (error) throw error;
      
      let nextNumber = "TR000001"; // Default starting number
      
      if (data && data.length > 0) {
        const lastNumber = data[0].transno;
        // Extract the numeric part and increment
        if (lastNumber.startsWith('TR')) {
          const numPart = parseInt(lastNumber.substring(2), 10);
          if (!isNaN(numPart)) {
            nextNumber = `TR${String(numPart + 1).padStart(6, '0')}`;
          }
        }
      }
      
      form.setValue("transno", nextNumber);
    } catch (error) {
      console.error('Error generating transaction number:', error);
      toast({
        title: "Error",
        description: "Failed to generate transaction number.",
        variant: "destructive",
      });
    }
  };

  const fetchProducts = async () => {
    try {
      // Get all products with their latest prices
      const { data: productsData, error: productsError } = await supabase
        .from('product')
        .select('*');
      
      if (productsError) throw productsError;
      
      // For each product, get the latest price
      const productsWithPrices = await Promise.all(
        productsData.map(async (product) => {
          const { data: priceData, error: priceError } = await supabase
            .from('pricehist')
            .select('unitprice')
            .eq('prodcode', product.prodcode)
            .order('effdate', { ascending: false })
            .limit(1);
          
          if (priceError) {
            console.error('Error fetching price for product:', priceError);
            return {
              ...product,
              unitprice: 0,
            };
          }
          
          return {
            ...product,
            unitprice: priceData && priceData.length > 0 ? priceData[0].unitprice : 0,
          };
        })
      );
      
      setProducts(productsWithPrices);
    } catch (error) {
      console.error('Error fetching products:', error);
      toast({
        title: "Error",
        description: "Failed to fetch products data.",
        variant: "destructive",
      });
    }
  };

  const fetchSaleDetails = async (transno: string) => {
    try {
      // First get active items
      const { data: activeDetails, error: activeError } = await supabase
        .from('salesdetail')
        .select('*')
        .eq('transno', transno)
        .is('deleted_at', null);
      
      if (activeError) throw activeError;
      
      // Then get deleted items
      const { data: deletedDetails, error: deletedError } = await supabase
        .from('salesdetail')
        .select('*')
        .eq('transno', transno)
        .not('deleted_at', 'is', null);
        
      if (deletedError) throw deletedError;
      
      if (activeDetails && activeDetails.length > 0) {
        const items = await Promise.all(
          activeDetails.map(async (detail: SalesDetailItem) => {
            const { data: priceData } = await supabase
              .from('pricehist')
              .select('unitprice')
              .eq('prodcode', detail.prodcode)
              .order('effdate', { ascending: false })
              .limit(1);
            
            const unitprice = priceData && priceData.length > 0 ? priceData[0].unitprice : 0;
            
            return {
              id: detail.id,
              prodcode: detail.prodcode,
              quantity: Number(detail.quantity),
              unitprice,
            };
          })
        );
        
        setSaleItems(items);
        
        // Update form with items data including id field
        form.setValue('items', items.map(item => ({ 
          id: item.id,
          prodcode: item.prodcode, 
          quantity: item.quantity,
          deleted_at: null
        })));
        
        calculateTotal(items);
      }
      
      if (deletedDetails && deletedDetails.length > 0) {
        const items = await Promise.all(
          deletedDetails.map(async (detail: SalesDetailItem) => {
            const { data: priceData } = await supabase
              .from('pricehist')
              .select('unitprice')
              .eq('prodcode', detail.prodcode)
              .order('effdate', { ascending: false })
              .limit(1);
            
            const unitprice = priceData && priceData.length > 0 ? priceData[0].unitprice : 0;
            
            return {
              id: detail.id,
              prodcode: detail.prodcode,
              quantity: Number(detail.quantity),
              unitprice,
              deleted_at: detail.deleted_at
            };
          })
        );
        
        setDeletedItems(items);
      }
    } catch (error) {
      console.error('Error fetching sale details:', error);
      toast({
        title: "Error",
        description: "Failed to fetch sale details.",
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      // Prevent double submission
      if (isSubmitting) return;
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
      id: undefined, 
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
    setEditingItemIndex(index);
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
    
    const selectedProduct = products.find(p => p.prodcode === prodcode);
    const unitprice = selectedProduct?.unitprice || 0;
    
    const updatedItems = [...saleItems];
    const quantity = updatedItems[index]?.quantity || 1;
    
    // Update or create the item
    if (index >= updatedItems.length) {
      updatedItems.push({ prodcode, quantity, unitprice });
    } else {
      updatedItems[index] = { ...updatedItems[index], prodcode, unitprice };
    }
    
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

  const calculateTotal = (items: SaleItem[]) => {
    const total = items.reduce((sum, item) => {
      return sum + (item.quantity * (item.unitprice || 0));
    }, 0);
    setTotalAmount(total);
  };

  const getProductPrice = (prodcode: string) => {
    const product = products.find(p => p.prodcode === prodcode);
    return product?.unitprice || 0;
  };

  const getProductName = (prodcode: string) => {
    const product = products.find(p => p.prodcode === prodcode);
    return product?.description || prodcode;
  };

  // Only show active items by default, toggle for deleted items
  const displayedItems = showDeleted ? deletedItems : saleItems;
  const canAddItems = permissions?.can_add_salesdetails || isAdmin;

  return (
    <ScrollArea className="max-h-[70vh] pr-4">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="transno"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Transaction No</FormLabel>
                <FormControl>
                  <Input {...field} disabled={true} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="salesdate"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Sale Date</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant={"outline"}
                        className={`w-full pl-3 text-left font-normal ${!field.value ? "text-muted-foreground" : ""}`}
                      >
                        {field.value ? (
                          format(field.value, "PPP")
                        ) : (
                          <span>Pick a date</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value || undefined}
                      onSelect={field.onChange}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="custno"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Customer</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value || undefined}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a customer" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {customers.map((customer) => (
                      <SelectItem key={customer.custno} value={customer.custno}>
                        {customer.custname} ({customer.custno})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <div>
            <div className="flex justify-between items-center mb-2">
              <FormLabel>Products</FormLabel>
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
                {!showDeleted && canAddItems && (
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm" 
                    onClick={handleAddProduct}
                  >
                    <Plus size={16} className="mr-2" /> Add Product
                  </Button>
                )}
              </div>
            </div>
            
            {displayedItems.length === 0 ? (
              <div className="text-center py-4 text-gray-500">
                {showDeleted ? "No deleted items found." : "No items added yet."}
              </div>
            ) : (
              displayedItems.map((item, index) => (
                <div key={index} className="flex gap-2 mb-3 items-end">
                  <div className="flex-grow space-y-2">
                    <FormLabel className="text-xs">Product</FormLabel>
                    <Select
                      value={item.prodcode}
                      onValueChange={(value) => handleProductChange(index, value)}
                      disabled={showDeleted || (!isAdmin && !permissions?.can_edit_salesdetails && isEditing)}
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
                      onChange={(e) => handleQuantityChange(index, parseInt(e.target.value) || 1)}
                      disabled={showDeleted || (!isAdmin && !permissions?.can_edit_salesdetails && isEditing)}
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
                        transno: selectedSale?.transno || "",
                        prodcode: item.prodcode,
                        quantity: item.quantity,
                        deleted_at: item.deleted_at
                      }}
                      onEdit={() => handleEditProduct(index)}
                      onDelete={() => handleRemoveProduct(index)}
                      onRestore={() => handleRestoreItem(item, index)}
                      showDeleted={showDeleted}
                    />
                  </div>
                </div>
              ))
            )}
            
            <div className="mt-4 p-3 bg-gray-50 rounded-md">
              <div className="flex justify-between items-center font-medium">
                <span>Total Amount:</span>
                <span className="text-lg">${totalAmount.toFixed(2)}</span>
              </div>
            </div>
          </div>
          
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
