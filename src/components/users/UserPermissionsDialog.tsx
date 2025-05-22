
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { 
  Dialog, DialogContent, DialogHeader, 
  DialogTitle, DialogFooter 
} from "@/components/ui/dialog";
import {
  Form, FormControl, FormField, FormItem, 
  FormLabel
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
        .from("user_permissions")
        .select("*")
        .eq("user_id", userId)
        .single();
      
      if (error) {
        if (error.code !== "PGRST116") {
          // PGRST116 means no rows returned
          console.error('Error fetching permissions:', error);
          toast({
            title: "Error",
            description: "Failed to fetch user permissions.",
            variant: "destructive",
          });
        }
        // Reset to default values if no permissions found
        form.reset({
          can_add_customers: false,
          can_edit_customers: false,
          can_delete_customers: false,
          can_add_sales: false,
          can_edit_sales: false,
          can_delete_sales: false,
        });
      } else if (data) {
        // Populate existing values
        form.reset({
          can_add_customers: data.can_add_customers,
          can_edit_customers: data.can_edit_customers,
          can_delete_customers: data.can_delete_customers,
          can_add_sales: data.can_add_sales,
          can_edit_sales: data.can_edit_sales,
          can_delete_sales: data.can_delete_sales,
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
        .from("user_permissions")
        .select("id")
        .eq("user_id", userId)
        .single();
      
      let result;
      
      if (existingPermission) {
        // Update existing permissions
        result = await supabase
          .from("user_permissions")
          .update({
            ...values,
            updated_at: new Date().toISOString()
          })
          .eq("user_id", userId);
      } else {
        // Create new permissions
        result = await supabase
          .from("user_permissions")
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
      <DialogContent className="sm:max-w-4xl max-h-[80vh] overflow-auto">
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Customer Permissions Column */}
                <div className="border rounded-lg p-4 space-y-3">
                  <h3 className="text-lg font-medium border-b pb-2">Customer Permissions</h3>
                  <FormField
                    control={form.control}
                    name="can_add_customers"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between space-y-0 py-2">
                        <div>
                          <FormLabel>Add Customers</FormLabel>
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
                      <FormItem className="flex items-center justify-between space-y-0 py-2">
                        <div>
                          <FormLabel>Edit Customers</FormLabel>
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
                      <FormItem className="flex items-center justify-between space-y-0 py-2">
                        <div>
                          <FormLabel>Delete Customers</FormLabel>
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
                
                {/* Sales Permissions Column */}
                <div className="border rounded-lg p-4 space-y-3">
                  <h3 className="text-lg font-medium border-b pb-2">Sales Permissions</h3>
                  <FormField
                    control={form.control}
                    name="can_add_sales"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between space-y-0 py-2">
                        <div>
                          <FormLabel>Add Sales</FormLabel>
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
                      <FormItem className="flex items-center justify-between space-y-0 py-2">
                        <div>
                          <FormLabel>Edit Sales</FormLabel>
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
                      <FormItem className="flex items-center justify-between space-y-0 py-2">
                        <div>
                          <FormLabel>Delete Sales</FormLabel>
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
