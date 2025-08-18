import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type UserRole = 'admin' | 'premium' | 'user' | null;

export const useUserRole = () => {
  const [userRole, setUserRole] = useState<UserRole>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserRole = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          setUserRole(null);
          setLoading(false);
          return;
        }

        const { data: roles, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id);

        if (error) {
          console.error('Error fetching user role:', error);
          setUserRole('user');
        } else if (roles && roles.length > 0) {
          // If user has multiple roles, prioritize admin > premium > user
          const roleHierarchy: UserRole[] = ['admin', 'premium', 'user'];
          const userRoles = roles.map(r => r.role as UserRole);
          const highestRole = roleHierarchy.find(role => userRoles.includes(role));
          setUserRole(highestRole || 'user');
        } else {
          setUserRole('user');
        }
      } catch (error) {
        console.error('Error in fetchUserRole:', error);
        setUserRole('user');
      } finally {
        setLoading(false);
      }
    };

    fetchUserRole();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      fetchUserRole();
    });

    return () => subscription.unsubscribe();
  }, []);

  const isAdmin = userRole === 'admin';
  const isPremium = userRole === 'premium' || userRole === 'admin';

  return {
    userRole,
    loading,
    isAdmin,
    isPremium
  };
};