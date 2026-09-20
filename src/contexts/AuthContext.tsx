import React, {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";
import authService from "@/services/authService";
import { onSessionExpired } from "@/services/apiClient";
import { tokenStorage } from "@/utils/tokenStorage";
import {
  User,
  StoredUser,
  LoginPayload,
  RegisterPayload,
  SurveyPayload,
  UpdateProfilePayload,
} from "@/types";

export type { User, StoredUser };

interface AuthContextType {
  user: StoredUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (payload: LoginPayload) => Promise<StoredUser>;
  loginWithGoogle: (idToken: string) => Promise<StoredUser>;
  register: (payload: RegisterPayload) => Promise<StoredUser>;
  logout: () => Promise<void>;
  updateSurvey: (payload: SurveyPayload) => Promise<StoredUser>;
  updateProfile: (payload: UpdateProfilePayload) => Promise<StoredUser>;
  refreshUser: () => Promise<StoredUser | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<StoredUser | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Initialize Auth state from AsyncStorage on app launch
  useEffect(() => {
    let isMounted = true;

    const loadAuth = async () => {
      try {
        const [token, storedUser] = await Promise.all([
          tokenStorage.getAccessToken(),
          tokenStorage.getUser(),
        ]);

        if (isMounted) {
          if (token && storedUser) {
            setUser(storedUser);
            // Silently fetch fresh user profile from backend in background
            authService
              .getMe()
              .then((freshUser) => {
                if (isMounted && freshUser) setUser(freshUser);
              })
              .catch(() => {
                // Keep storedUser if offline
              });
          } else {
            setUser(null);
          }
        }
      } catch (e) {
        if (isMounted) {
          console.error("Error checking auth state", e);
          setUser(null);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadAuth();

    // Listen for session expiration from axios interceptor
    const unsubscribe = onSessionExpired(() => {
      if (isMounted) {
        setUser(null);
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  const login = async (payload: LoginPayload): Promise<StoredUser> => {
    const data = await authService.login(payload);
    setUser(data.user);
    return data.user;
  };

  const loginWithGoogle = async (idToken: string): Promise<StoredUser> => {
    const data = await authService.loginWithGoogle(idToken);
    setUser(data.user);
    return data.user;
  };

  const register = async (payload: RegisterPayload): Promise<StoredUser> => {
    const data = await authService.register(payload);
    // User requested: After signup, do not keep logged in; redirect to login
    await tokenStorage.clearAuthSession();
    setUser(null);
    return data.user;
  };

  const logout = async (): Promise<void> => {
    try {
      await authService.logout();
    } finally {
      setUser(null);
    }
  };

  const updateSurvey = async (payload: SurveyPayload): Promise<StoredUser> => {
    const updatedUser = await authService.updateSurvey(payload);
    setUser(updatedUser);
    return updatedUser;
  };

  const updateProfile = async (payload: UpdateProfilePayload): Promise<StoredUser> => {
    const updatedUser = await authService.updateProfile(payload);
    setUser(updatedUser);
    return updatedUser;
  };

  const refreshUser = async (): Promise<StoredUser | null> => {
    try {
      const freshUser = await authService.getMe();
      setUser(freshUser);
      return freshUser;
    } catch {
      return user;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        loginWithGoogle,
        register,
        logout,
        updateSurvey,
        updateProfile,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export default AuthContext;
