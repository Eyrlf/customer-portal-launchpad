
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
        can_add_salesdetails: true,
        can_edit_salesdetails: true,
        can_delete_salesdetails: true,
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
          can_add_salesdetails: false,
          can_edit_salesdetails: false,
          can_delete_salesdetails: false,
          created_at: "",
          updated_at: ""
        });
        return;
      }
      
      if (data) {
        // Add new properties with default values if they don't exist in the data
        setUserPermissions({
          ...data,
          can_add_salesdetails: data.can_add_salesdetails !== undefined ? data.can_add_salesdetails : false,
          can_edit_salesdetails: data.can_edit_salesdetails !== undefined ? data.can_edit_salesdetails : false,
          can_delete_salesdetails: data.can_delete_salesdetails !== undefined ? data.can_delete_salesdetails : false
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
