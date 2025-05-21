import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { 
  Table, TableBody, TableCaption, TableCell, 
  TableHead, TableHeader, TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { 
  DropdownMenu, DropdownMenuContent, 
  DropdownMenuItem, DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/components/ui/use-toast";
import { Edit, MoreVertical, Shield, Key } from "lucide-react";
import { 
  Dialog, DialogContent, DialogHeader, 
  DialogTitle, DialogDescription, DialogFooter
} from "@/components/ui/dialog";
import {
  Form, FormControl, FormField, FormItem, 
  FormLabel, FormMessage
} from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserPermissionsDialog } from "./UserPermissionsDialog"; 
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

interface User {
  id: string;
  email: string;
  profile: {
    first_name: string | null;
    last_name: string | null;
    role: 'admin' | 'customer';
  };
}

export function UsersTable() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [permissionsDialogOpen, setPermissionsDialogOpen] = useState(false);
  const { toast } = useToast();

  const formSchema = z.object({
    role: z.enum(['admin', 'customer']),
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      role: 'customer',
    },
  });

  useEffect(() => {
    if (selectedUser) {
      form.reset({
        role: selectedUser.profile.role,
      });
    }
  }, [selectedUser, form]);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      // Updated query to fetch profiles with emails
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, role, email');
      
      if (profilesError) throw profilesError;

      // Transform profiles to the expected user structure
      const usersWithProfile = profiles.map(profile => ({
        id: profile.id,
        email: profile.email || 'No email',
        profile: {
          first_name: profile.first_name,
          last_name: profile.last_name,
          role: profile.role as 'admin' | 'customer',
        },
      }));
      
      setUsers(usersWithProfile);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: "Error",
        description: "Failed to fetch users. You might not have admin permissions.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (user: User) => {
    setSelectedUser(user);
    setEditDialogOpen(true);
  };

  const handleManagePermissions = (user: User) => {
    if (user.profile.role === 'admin') {
      toast({
        title: "Information",
        description: "Admin users automatically have all permissions.",
      });
      return;
    }
    
    setSelectedUser(user);
    setPermissionsDialogOpen(true);
  };

  const updateUserRole = async (values: z.infer<typeof formSchema>) => {
    if (!selectedUser) return;
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .update({ role: values.role })
        .eq('id', selectedUser.id);
      
      if (error) throw error;
      
      toast({
        title: "Role updated",
        description: `${selectedUser.profile.first_name || selectedUser.email}'s role has been updated to ${values.role}.`,
      });
      
      setEditDialogOpen(false);
      fetchUsers();
      
      // Log activity
      await supabase.rpc('log_activity', {
        action: 'update',
        table_name: 'profiles',
        record_id: selectedUser.id,
        details: JSON.stringify({
          field: 'role',
          old_value: selectedUser.profile.role,
          new_value: values.role,
        }),
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update user role.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-2xl font-bold mb-6">User Management</h2>
      
      <Table>
        <TableCaption>{loading ? 'Loading users...' : 'List of all users in the system.'}</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Role</TableHead>
            <TableHead className="w-[100px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.length === 0 && !loading ? (
            <TableRow>
              <TableCell colSpan={4} className="text-center">No users found.</TableCell>
            </TableRow>
          ) : (
            users.map((user) => (
              <TableRow key={user.id}>
                <TableCell>
                  {user.profile.first_name && user.profile.last_name
                    ? `${user.profile.first_name} ${user.profile.last_name}`
                    : 'No name set'}
                </TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    user.profile.role === 'admin' 
                      ? 'bg-blue-100 text-blue-800' 
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {user.profile.role}
                  </span>
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreVertical size={16} />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleEdit(user)}>
                        <Shield className="mr-2 h-4 w-4" />
                        Change Role
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleManagePermissions(user)}>
                        <Key className="mr-2 h-4 w-4" />
                        Manage Permissions
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
      
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User Role</DialogTitle>
            <DialogDescription>
              Change the role for {selectedUser?.profile.first_name || selectedUser?.email}
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(updateUserRole)} className="space-y-6">
              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="customer">Customer</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)}>Cancel</Button>
                <Button type="submit">Save Changes</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      {selectedUser && (
        <UserPermissionsDialog
          userId={selectedUser.id}
          userName={selectedUser.profile.first_name || selectedUser.email}
          isOpen={permissionsDialogOpen}
          onClose={() => setPermissionsDialogOpen(false)}
        />
      )}
    </div>
  );
}
