import {
  ReactNode,
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../supabase/client';

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  userId: string | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
	signUp: (email: string, password: string) => Promise<boolean>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getInitialSession = async () => {
      const { data, error } = await supabase.auth.getSession();

      if (error) {
        console.error('Error fetching session', error);
      }

      setSession(data.session);
      setUser(data.session?.user ?? null);
      setLoading(false);
    };

    getInitialSession();

    const { data: listener } = supabase.auth.onAuthStateChange((_, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
      setLoading(false);
    });

    return () => listener?.subscription.unsubscribe();
  }, []);

	const handleSignIn = async (email: string, password: string) => {
    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();

    const { data, error } = await supabase.auth.signInWithPassword({
      email: trimmedEmail,
      password: trimmedPassword,
    });

    if (error) {
      throw error;
    }

    setSession(data.session);
    setUser(data.session?.user ?? null);
  };

	const handleSignUp = async (email: string, password: string) => {
			const trimmedEmail = email.trim();
			const trimmedPassword = password.trim();

			const { data, error } = await supabase.auth.signUp({
				email: trimmedEmail,
				password: trimmedPassword,
	      options: {
	        emailRedirectTo: window.location.origin,
	        data: {
	          // Provide basic metadata to avoid downstream NOT NULL triggers in profile tables.
	          email_lower: trimmedEmail.toLowerCase(),
	        },
	      },
			});

			if (error) {
				throw error;
			}

			setSession(data.session);
			setUser(data.session?.user ?? data.user ?? null);

			return Boolean(data.session);
		};

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();

    if (error) {
      throw error;
    }

    setSession(null);
    setUser(null);
  };

  const value = useMemo(() => {
    const userId = user?.id ?? null;

    return {
      session,
      user,
      userId,
      loading,
      signIn: handleSignIn,
			signUp: handleSignUp,
      signOut: handleSignOut,
    };
  }, [loading, session, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
}
