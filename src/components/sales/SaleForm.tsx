
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { SalesRecord, Customer, Employee } from "./types";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";
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
import { CalendarIcon } from "lucide-react";
import {
  DialogFooter
} from "@/components/ui/dialog";

interface SaleFormProps {
  selectedSale: SalesRecord | null;
  isEditing: boolean;
  customers: Customer[];
  employees: Employee[];
  onSubmitSuccess: () => void;
  onCancel: () => void;
}

const formSchema = z.object({
  transno: z.string().min(1, "Transaction number is required"),
  salesdate: z.date().nullable(),
  custno: z.string().nullable(),
  empno: z.string().nullable(),
});

export function SaleForm({ 
  selectedSale, 
  isEditing, 
  customers, 
  employees, 
  onSubmitSuccess, 
  onCancel 
}: SaleFormProps) {
  const { toast } = useToast();
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      transno: "",
      salesdate: null,
      custno: null,
      empno: null,
    },
  });

  useEffect(() => {
    if (selectedSale && isEditing) {
      form.reset({
        transno: selectedSale.transno,
        salesdate: selectedSale.salesdate ? new Date(selectedSale.salesdate) : null,
        custno: selectedSale.custno,
        empno: selectedSale.empno,
      });
    } else if (!isEditing) {
      form.reset({
        transno: "",
        salesdate: new Date(),
        custno: null,
        empno: null,
      });
    }
  }, [selectedSale, isEditing, form]);

  const handleSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      if (isEditing && selectedSale) {
        // Update existing sale
        const { error } = await supabase
          .from('sales')
          .update({
            salesdate: values.salesdate?.toISOString(),
            custno: values.custno,
            empno: values.empno,
          })
          .eq('transno', selectedSale.transno);
        
        if (error) throw error;
        
        toast({
          title: "Sale Updated",
          description: `Sale #${selectedSale.transno} has been updated successfully.`,
        });
        
        // Log activity
        await supabase.rpc('log_activity', {
          action: 'update',
          table_name: 'sales',
          record_id: selectedSale.transno,
          details: JSON.stringify(values),
        });
      } else {
        // Create new sale
        const { error } = await supabase
          .from('sales')
          .insert({
            transno: values.transno,
            salesdate: values.salesdate?.toISOString(),
            custno: values.custno,
            empno: values.empno,
          });
        
        if (error) {
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
        
        toast({
          title: "Sale Created",
          description: `Sale #${values.transno} has been created successfully.`,
        });
        
        // Log activity
        await supabase.rpc('log_activity', {
          action: 'insert',
          table_name: 'sales',
          record_id: values.transno,
          details: JSON.stringify(values),
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
                <Input {...field} disabled={isEditing} />
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
        
        <FormField
          control={form.control}
          name="empno"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Employee</FormLabel>
              <Select
                onValueChange={field.onChange}
                defaultValue={field.value || undefined}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select an employee" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {employees.map((employee) => (
                    <SelectItem key={employee.empno} value={employee.empno}>
                      {employee.firstname} {employee.lastname} ({employee.empno})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
          <Button type="submit">{isEditing ? 'Update' : 'Create'}</Button>
        </DialogFooter>
      </form>
    </Form>
  );
}
