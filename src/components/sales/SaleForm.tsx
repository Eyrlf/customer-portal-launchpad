
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { SalesRecord, Customer } from "./types";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { format } from "date-fns";
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
import { CalendarIcon, Plus, Trash } from "lucide-react";
import {
  DialogFooter
} from "@/components/ui/dialog";

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

interface SaleItem {
  prodcode: string;
  quantity: number;
  unitprice: number;
}

const formSchema = z.object({
  transno: z.string().min(1, "Transaction number is required"),
  salesdate: z.date().nullable(),
  custno: z.string().nullable(),
  items: z.array(
    z.object({
      prodcode: z.string().min(1, "Product is required"),
      quantity: z.number().min(1, "Quantity must be at least 1"),
    })
  ),
});

export function SaleForm({ 
  selectedSale, 
  isEditing, 
  customers, 
  onSubmitSuccess, 
  onCancel 
}: SaleFormProps) {
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [saleItems, setSaleItems] = useState<SaleItem[]>([]);
  const [totalAmount, setTotalAmount] = useState(0);
  
  const form = useForm<z.infer<typeof formSchema>>({
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
        items: [{ prodcode: "", quantity: 1 }],
      });
      setSaleItems([]);
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
      const { data: detailsData, error: detailsError } = await supabase
        .from('salesdetail')
        .select('*')
        .eq('transno', transno);
      
      if (detailsError) throw detailsError;
      
      if (detailsData && detailsData.length > 0) {
        const items = await Promise.all(
          detailsData.map(async (detail) => {
            const { data: priceData, error: priceError } = await supabase
              .from('pricehist')
              .select('unitprice')
              .eq('prodcode', detail.prodcode)
              .order('effdate', { ascending: false })
              .limit(1);
            
            const unitprice = priceData && priceData.length > 0 ? priceData[0].unitprice : 0;
            
            return {
              prodcode: detail.prodcode,
              quantity: Number(detail.quantity),
              unitprice,
            };
          })
        );
        
        setSaleItems(items);
        form.setValue('items', items.map(item => ({ 
          prodcode: item.prodcode, 
          quantity: item.quantity 
        })));
        
        calculateTotal(items);
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
        
        if (error) throw error;
        
        // Delete existing sale details
        const { error: deleteError } = await supabase
          .from('salesdetail')
          .delete()
          .eq('transno', selectedSale.transno);
        
        if (deleteError) throw deleteError;
        
        // Insert new sale details
        if (saleItems.length > 0) {
          const { error: insertError } = await supabase
            .from('salesdetail')
            .insert(
              saleItems.map(item => ({
                transno: selectedSale.transno,
                prodcode: item.prodcode,
                quantity: item.quantity,
              }))
            );
          
          if (insertError) throw insertError;
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
        // Create new sale - make sure we're setting the necessary fields
        console.log("Creating new sale with values:", values);
        
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
            return;
          }
          throw error;
        }
        
        console.log("Sale created successfully, inserting details for:", saleItems.length, "items");
        
        // Insert sale details
        if (saleItems.length > 0) {
          const { error: insertError } = await supabase
            .from('salesdetail')
            .insert(
              saleItems.map(item => ({
                transno: values.transno,
                prodcode: item.prodcode,
                quantity: item.quantity,
              }))
            );
          
          if (insertError) {
            console.error("Error inserting sale details:", insertError);
            throw insertError;
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
      
      onSubmitSuccess();
    } catch (error) {
      console.error('Error submitting sale:', error);
      toast({
        title: "Error",
        description: "Failed to save sale data.",
        variant: "destructive",
      });
    }
  };

  const handleAddProduct = () => {
    const newItem = { prodcode: "", quantity: 1, unitprice: 0 };
    setSaleItems([...saleItems, newItem]);
    
    const currentItems = form.getValues('items') || [];
    form.setValue('items', [...currentItems, { prodcode: "", quantity: 1 }]);
  };

  const handleRemoveProduct = (index: number) => {
    const updatedItems = [...saleItems];
    updatedItems.splice(index, 1);
    setSaleItems(updatedItems);
    
    const currentItems = form.getValues('items');
    const updatedFormItems = [...currentItems];
    updatedFormItems.splice(index, 1);
    form.setValue('items', updatedFormItems);
    
    calculateTotal(updatedItems);
  };

  const handleProductChange = (index: number, prodcode: string) => {
    const selectedProduct = products.find(p => p.prodcode === prodcode);
    const unitprice = selectedProduct?.unitprice || 0;
    
    const updatedItems = [...saleItems];
    const quantity = updatedItems[index]?.quantity || 1;
    
    // Update or create the item
    if (index >= updatedItems.length) {
      updatedItems.push({ prodcode, quantity, unitprice });
    } else {
      updatedItems[index] = { prodcode, quantity, unitprice };
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
    const updatedItems = [...saleItems];
    if (index < updatedItems.length) {
      updatedItems[index].quantity = quantity;
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

  return (
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
            <Button 
              type="button" 
              variant="outline" 
              size="sm" 
              onClick={handleAddProduct}
            >
              <Plus size={16} className="mr-2" /> Add Product
            </Button>
          </div>
          
          {saleItems.map((item, index) => (
            <div key={index} className="flex gap-2 mb-3 items-end">
              <div className="flex-grow space-y-2">
                <FormLabel className="text-xs">Product</FormLabel>
                <Select
                  value={item.prodcode}
                  onValueChange={(value) => handleProductChange(index, value)}
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
                />
              </div>
              
              <div className="w-20 space-y-2">
                <FormLabel className="text-xs">Price</FormLabel>
                <Input
                  type="text"
                  value={`$${getProductPrice(item.prodcode).toFixed(2)}`}
                  disabled
                />
              </div>
              
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => handleRemoveProduct(index)}
                className="mb-1"
              >
                <Trash size={16} />
              </Button>
            </div>
          ))}

          <div className="mt-4 p-3 bg-gray-50 rounded-md">
            <div className="flex justify-between items-center font-medium">
              <span>Total Amount:</span>
              <span className="text-lg">${totalAmount.toFixed(2)}</span>
            </div>
          </div>
        </div>
        
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
          <Button type="submit">{isEditing ? 'Update' : 'Create'}</Button>
        </DialogFooter>
      </form>
    </Form>
  );
}
