
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { UserPermission } from "../../sales/types";

export function useCustomerPermissions(isAdmin: boolean, userId: string | undefined) {
  const [userPermissions, setUserPermissions] = useState<UserPermission | null>(null);

  useEffect(() => {
    if (userId && !isAdmin) {
      fetchUserPermissions(userId);
    } else if (isAdmin) {
      // Admins have all permissions
      setUserPermissions({
        id: "",
        user_id: userId || "",
        can_add_customers: true,
        can_edit_customers: true,
        can_delete_customers: true,
        can_add_sales: true,
        can_edit_sales: true,
        can_delete_sales: true,
        created_at: "",
        updated_at: ""
      });
    }
  }, [isAdmin, userId]);

  const fetchUserPermissions = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("user_permissions")
        .select("*")
        .eq("user_id", userId)
        .single();
      
      if (error) {
        if (error.code !== "PGRST116") {
          // PGRST116 means no rows returned
          console.error('Error fetching user permissions:', error);
        }
        // Default to no permissions if none are set
        setUserPermissions({
          id: "",
          user_id: userId,
          can_add_customers: false,
          can_edit_customers: false,
          can_delete_customers: false,
          can_add_sales: false,
          can_edit_sales: false,
          can_delete_sales: false,
          created_at: "",
          updated_at: ""
        });
        return;
      }
      
      if (data) {
        setUserPermissions({
          ...data,
          can_add_customers: data.can_add_customers !== undefined ? data.can_add_customers : false,
          can_edit_customers: data.can_edit_customers !== undefined ? data.can_edit_customers : false,
          can_delete_customers: data.can_delete_customers !== undefined ? data.can_delete_customers : false,
          can_add_sales: data.can_add_sales !== undefined ? data.can_add_sales : false,
          can_edit_sales: data.can_edit_sales !== undefined ? data.can_edit_sales : false,
          can_delete_sales: data.can_delete_sales !== undefined ? data.can_delete_sales : false,
        } as UserPermission);
      }
    } catch (error) {
      console.error('Error in fetchUserPermissions:', error);
    }
  };

  const canAddCustomer = isAdmin || (userPermissions?.can_add_customers || false);
  const canEditCustomer = isAdmin || (userPermissions?.can_edit_customers || false);
  const canDeleteCustomer = isAdmin || (userPermissions?.can_delete_customers || false);

  return {
    userPermissions,
    canAddCustomer,
    canEditCustomer,
    canDeleteCustomer
  };
}
