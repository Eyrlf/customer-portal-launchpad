
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { UserPermission } from "@/components/sales/types";
import { 
  Dialog, DialogContent, DialogHeader, 
  DialogTitle, DialogFooter 
} from "@/components/ui/dialog";
import {
  Form, FormControl, FormField, FormItem, 
  FormLabel, FormDescription
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";

interface UserPermissionsDialogProps {
  userId: string;
  userName: string;
  isOpen: boolean;
  onClose: () => void;
}

const formSchema = z.object({
  can_add_customers: z.boolean(),
  can_edit_customers: z.boolean(),
  can_delete_customers: z.boolean(),
  can_add_sales: z.boolean(),
  can_edit_sales: z.boolean(),
  can_delete_sales: z.boolean(),
});

export function UserPermissionsDialog({
  userId,
  userName,
  isOpen,
  onClose
}: UserPermissionsDialogProps) {
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      can_add_customers: false,
      can_edit_customers: false,
      can_delete_customers: false,
      can_add_sales: false,
      can_edit_sales: false,
      can_delete_sales: false,
    },
  });

  useEffect(() => {
    if (isOpen && userId) {
      fetchUserPermissions();
    }
  }, [isOpen, userId]);

  const fetchUserPermissions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_permissions')
        .select('*')
        .eq('user_id', userId)
        .single();
      
      if (error && error.code !== 'PGRST116') {
        // PGRST116 means no rows returned
        console.error('Error fetching permissions:', error);
        toast({
          title: "Error",
          description: "Failed to fetch user permissions.",
          variant: "destructive",
        });
      }
      
      if (data) {
        form.reset({
          can_add_customers: data.can_add_customers,
          can_edit_customers: data.can_edit_customers,
          can_delete_customers: data.can_delete_customers,
          can_add_sales: data.can_add_sales,
          can_edit_sales: data.can_edit_sales,
          can_delete_sales: data.can_delete_sales,
        });
      } else {
        // Reset to default values if no permissions found
        form.reset({
          can_add_customers: false,
          can_edit_customers: false,
          can_delete_customers: false,
          can_add_sales: false,
          can_edit_sales: false,
          can_delete_sales: false,
        });
      }
    } catch (error) {
      console.error('Error in fetchUserPermissions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      const { data: existingPermission, error: checkError } = await supabase
        .from('user_permissions')
        .select('id')
        .eq('user_id', userId)
        .single();
      
      let result;
      
      if (existingPermission) {
        // Update existing permissions
        result = await supabase
          .from('user_permissions')
          .update({
            ...values,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', userId);
      } else {
        // Create new permissions
        result = await supabase
          .from('user_permissions')
          .insert({
            user_id: userId,
            ...values,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
      }
      
      if (result.error) throw result.error;
      
      toast({
        title: "Permissions Updated",
        description: `Permissions for ${userName} have been updated successfully.`,
      });
      
      // Log activity
      await supabase.rpc('log_activity', {
        action: existingPermission ? 'update' : 'insert',
        table_name: 'user_permissions',
        record_id: userId,
        details: JSON.stringify(values),
      });
      
      onClose();
    } catch (error) {
      console.error('Error updating permissions:', error);
      toast({
        title: "Error",
        description: "Failed to update user permissions.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Manage Permissions for {userName}</DialogTitle>
        </DialogHeader>
        
        {loading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Customer Permissions</h3>
                <div className="space-y-3">
                  <FormField
                    control={form.control}
                    name="can_add_customers"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                        <div className="space-y-0.5">
                          <FormLabel>Add Customers</FormLabel>
                          <FormDescription>
                            Allow user to create new customers
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="can_edit_customers"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                        <div className="space-y-0.5">
                          <FormLabel>Edit Customers</FormLabel>
                          <FormDescription>
                            Allow user to modify customer details
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="can_delete_customers"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                        <div className="space-y-0.5">
                          <FormLabel>Delete Customers</FormLabel>
                          <FormDescription>
                            Allow user to delete customers
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
              </div>
              
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Sales Permissions</h3>
                <div className="space-y-3">
                  <FormField
                    control={form.control}
                    name="can_add_sales"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                        <div className="space-y-0.5">
                          <FormLabel>Add Sales</FormLabel>
                          <FormDescription>
                            Allow user to create new sales
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="can_edit_sales"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                        <div className="space-y-0.5">
                          <FormLabel>Edit Sales</FormLabel>
                          <FormDescription>
                            Allow user to modify sales details
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="can_delete_sales"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                        <div className="space-y-0.5">
                          <FormLabel>Delete Sales</FormLabel>
                          <FormDescription>
                            Allow user to delete sales
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
              </div>
              
              <DialogFooter>
                <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
                <Button type="submit">Save Changes</Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
