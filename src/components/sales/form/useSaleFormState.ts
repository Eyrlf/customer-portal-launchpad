
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { SalesRecord } from "../types";
import { FormValues, formSchema, Product, SaleItem } from "./types";

export function useSaleFormState(
  selectedSale: SalesRecord | null,
  isEditing: boolean,
  onSubmitSuccess: () => void
) {
  const { toast } = useToast();
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
          activeDetails.map(async (detail) => {
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
          deletedDetails.map(async (detail) => {
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

  return {
    form,
    products,
    saleItems,
    setSaleItems,
    deletedItems,
    setDeletedItems,
    showDeleted,
    setShowDeleted,
    totalAmount,
    setTotalAmount,
    isSubmitting,
    setIsSubmitting,
    editingItemIndex,
    setEditingItemIndex,
    calculateTotal,
    getProductPrice,
    getProductName,
    fetchSaleDetails
  };
}
