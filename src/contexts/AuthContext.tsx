import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import authService, {
  LoginPayload,
  RegisterPayload,
  SurveyPayload,
} from "@/services/authService";
import { onSessionExpired } from "@/services/apiClient";
import { StoredUser, tokenStorage } from "@/utils/tokenStorage";

interface AuthContextType {
  user: StoredUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (payload: LoginPayload) => Promise<StoredUser>;
  register: (payload: RegisterPayload) => Promise<StoredUser>;
  logout: () => Promise<void>;
  updateSurvey: (payload: SurveyPayload) => Promise<StoredUser>;
  refreshUser: () => Promise<StoredUser | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<StoredUser | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Initialize Auth state from AsyncStorage on app launch
  const checkAuth = useCallback(async () => {
    try {
      setIsLoading(true);
      const [token, storedUser] = await Promise.all([
        tokenStorage.getAccessToken(),
        tokenStorage.getUser(),
      ]);

      if (token && storedUser) {
        setUser(storedUser);
        // Silently fetch fresh user profile from backend in background
        authService
          .getMe()
          .then((freshUser) => setUser(freshUser))
          .catch(() => {
            // Keep storedUser if offline
          });
      } else {
        setUser(null);
      }
    } catch (e) {
      console.error("Error checking auth state", e);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();

    // Listen for session expiration from axios interceptor
    const unsubscribe = onSessionExpired(() => {
      setUser(null);
    });

    return unsubscribe;
  }, [checkAuth]);

  const login = async (payload: LoginPayload): Promise<StoredUser> => {
    const data = await authService.login(payload);
    setUser(data.user);
    return data.user;
  };

  const register = async (payload: RegisterPayload): Promise<StoredUser> => {
    const data = await authService.register(payload);
    setUser(data.user);
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
        register,
        logout,
        updateSurvey,
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
