import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import type { AppRole, Profile } from "../lib/database.types";
import { supabase, supabaseConfigError } from "../lib/supabase";

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  roles: AppRole[];
  isLoading: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(supabaseConfigError);
  const requestNumber = useRef(0);

  const clearAccount = useCallback(() => {
    setSession(null);
    setUser(null);
    setProfile(null);
    setRoles([]);
  }, []);

  const loadAccount = useCallback(async (nextSession: Session | null) => {
    const requestId = ++requestNumber.current;
    if (!supabase) {
      clearAccount();
      setError(supabaseConfigError);
      setIsLoading(false);
      return;
    }

    if (!nextSession) {
      clearAccount();
      setError(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    setSession(nextSession);

    try {
      const { data: userData, error: userError } = await supabase.auth.getUser(nextSession.access_token);
      if (requestId !== requestNumber.current) return;
      if (userError) throw userError;

      const authenticatedUser = userData.user;
      const [{ data: profileData, error: profileError }, { data: roleData, error: roleError }] =
        await Promise.all([
          supabase
            .from("profiles")
            .select("user_id, display_name, avatar_path, created_at, updated_at")
            .eq("user_id", authenticatedUser.id)
            .maybeSingle(),
          supabase.from("user_roles").select("role").eq("user_id", authenticatedUser.id),
        ]);

      if (requestId !== requestNumber.current) return;
      if (profileError) throw profileError;
      if (roleError) throw roleError;

      setUser(authenticatedUser);
      setProfile(profileData);
      setRoles(roleData.map(({ role }) => role));
    } catch (accountError) {
      if (requestId !== requestNumber.current) return;
      clearAccount();
      setError(accountError instanceof Error ? accountError.message : "Could not load account permissions.");
    } finally {
      if (requestId === requestNumber.current) setIsLoading(false);
    }
  }, [clearAccount]);

  useEffect(() => {
    if (!supabase) {
      setIsLoading(false);
      return;
    }

    let active = true;
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (active) void loadAccount(nextSession);
    });

    void supabase.auth.getSession().then(({ data, error: sessionError }) => {
      if (!active) return;
      if (sessionError) {
        setError(sessionError.message);
        setIsLoading(false);
        return;
      }
      void loadAccount(data.session);
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, [loadAccount]);

  const value = useMemo<AuthContextValue>(() => ({
    session,
    user,
    profile,
    roles,
    isLoading,
    error,
    async signIn(email, password) {
      if (!supabase) throw new Error(supabaseConfigError ?? "Supabase is not configured.");
      const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) throw signInError;
      await loadAccount(data.session);
    },
    async signOut() {
      if (!supabase) throw new Error(supabaseConfigError ?? "Supabase is not configured.");
      const { error: signOutError } = await supabase.auth.signOut();
      if (signOutError) throw signOutError;
    },
    async sendPasswordReset(email) {
      if (!supabase) throw new Error(supabaseConfigError ?? "Supabase is not configured.");
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (resetError) throw resetError;
    },
    async updatePassword(password) {
      if (!supabase) throw new Error(supabaseConfigError ?? "Supabase is not configured.");
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
    },
  }), [error, isLoading, loadAccount, profile, roles, session, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider.");
  return context;
}
