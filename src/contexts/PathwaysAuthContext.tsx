import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface PathwaysUser {
  id: string;
  email: string;
  role: 'STUDENT' | 'ADMIN';
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  school: string | null;
  status: 'registered' | 'admitted_to_payment' | 'payment_uploaded' | 'active' | 'revoked';
}

interface PathwaysAuthContextType {
  user: PathwaysUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  register: (data: RegisterData) => Promise<{ success: boolean; error?: string }>;
}

interface RegisterData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  school: string;
  password: string;
}

const PathwaysAuthContext = createContext<PathwaysAuthContextType | undefined>(undefined);

export const PathwaysAuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<PathwaysUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Don't auto-login from localStorage - users must login explicitly
    setLoading(false);
  }, []);

  const hashPassword = async (password: string): Promise<string> => {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return btoa(hashHex); // Base64 encode for storage
  };

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const passwordHash = await hashPassword(password);

      const { data, error } = await supabase
        .from('pathways_users')
        .select('*')
        .eq('email', email)
        .eq('password_hash', passwordHash)
        .maybeSingle();

      if (error || !data) {
        return { success: false, error: 'Invalid credentials' };
      }

      const userData: PathwaysUser = {
        id: data.id,
        email: data.email,
        role: data.role,
        first_name: data.first_name,
        last_name: data.last_name,
        phone: data.phone,
        school: data.school,
        status: data.status,
      };

      setUser(userData);
      // Session only - don't persist to localStorage

      return { success: true };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'Login failed' };
    }
  };

  const logout = () => {
    setUser(null);
    // Don't persist user session anymore
  };

  const register = async (data: RegisterData): Promise<{ success: boolean; error?: string }> => {
    try {
      const passwordHash = await hashPassword(data.password);

      const { data: newUser, error } = await supabase
        .from('pathways_users')
        .insert({
          email: data.email,
          password_hash: passwordHash,
          role: 'STUDENT',
          first_name: data.firstName,
          last_name: data.lastName,
          phone: data.phone,
          school: data.school,
          status: 'registered',
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') { // Unique constraint violation
          return { success: false, error: 'Email already registered' };
        }
        return { success: false, error: error.message };
      }

      // Auto login after registration
      const userData: PathwaysUser = {
        id: newUser.id,
        email: newUser.email,
        role: newUser.role,
        first_name: newUser.first_name,
        last_name: newUser.last_name,
        phone: newUser.phone,
        school: newUser.school,
        status: newUser.status,
      };

      setUser(userData);
      // Session only - don't persist to localStorage

      // Send signup notification emails
      await supabase.functions.invoke('send-pathways-signup-notification', {
        body: {
          studentEmail: newUser.email,
          studentName: `${newUser.first_name} ${newUser.last_name}`,
          studentPhone: newUser.phone || '',
          studentSchool: newUser.school || '',
        },
      });

      return { success: true };
    } catch (error) {
      console.error('Registration error:', error);
      return { success: false, error: 'Registration failed' };
    }
  };

  return (
    <PathwaysAuthContext.Provider value={{ user, loading, login, logout, register }}>
      {children}
    </PathwaysAuthContext.Provider>
  );
};

export const usePathwaysAuth = () => {
  const context = useContext(PathwaysAuthContext);
  if (context === undefined) {
    throw new Error('usePathwaysAuth must be used within PathwaysAuthProvider');
  }
  return context;
};