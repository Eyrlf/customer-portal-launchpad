
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DialogFooter } from "@/components/ui/dialog";

export const customerFormSchema = z.object({
  custno: z.string().min(1, "Customer number is required"),
  custname: z.string().min(1, "Customer name is required").max(20, "Customer name must be 20 characters or less"),
  address: z.string().optional().transform(val => val || "").pipe(z.string().max(50, "Address must be 50 characters or less")),
  payterm: z.string().optional(),
});

export type CustomerFormValues = z.infer<typeof customerFormSchema>;

interface CustomerFormProps {
  defaultValues: CustomerFormValues;
  onSubmit: (values: CustomerFormValues) => void;
  onCancel: () => void;
  isEditing: boolean;
}

export function CustomerForm({
  defaultValues,
  onSubmit,
  onCancel,
  isEditing
}: CustomerFormProps) {
  // Ensure defaultValues is never undefined
  const formValues: CustomerFormValues = {
    custno: defaultValues?.custno || "",
    custname: defaultValues?.custname || "",
    address: defaultValues?.address || "",
    payterm: defaultValues?.payterm || "COD",
  };

  const form = useForm<CustomerFormValues>({
    resolver: zodResolver(customerFormSchema),
    defaultValues: formValues,
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="custno"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Customer No</FormLabel>
              <FormControl>
                <Input {...field} disabled={isEditing} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="custname"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Customer Name</FormLabel>
              <FormControl>
                <Input {...field} maxLength={20} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="address"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Address</FormLabel>
              <FormControl>
                <Input {...field} maxLength={50} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="payterm"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Payment Term</FormLabel>
              <Select
                onValueChange={field.onChange}
                defaultValue={field.value || "COD"}
              >
                <FormControl>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Select payment term" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent className="w-40">
                  <SelectItem value="COD">COD</SelectItem>
                  <SelectItem value="30D">30D</SelectItem>
                  <SelectItem value="45D">45D</SelectItem>
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
