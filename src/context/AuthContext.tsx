//src/context/Authcontext.tsx
// --- Define Context Type ---

import authService, { AuthResponse, User } from "@/services/authService";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
type AuthContextType = {
  user: User | null;
  isLoading: boolean; // Still represents initial auth check loading
  roles: string[]; // Array of role names
  permissions: string[]; // Array of permission names
  checkAuthStatus: () => Promise<void>; // Function to re-check auth if needed
  handleLoginSuccess: (authResponse: AuthResponse) => void; // Accept full AuthResponse
  handleRegisterSuccess: (authResponse: AuthResponse) => void; // Accept full AuthResponse
  handleLogout: () => Promise<void>;
};

// Include roles and permissions in the context value

// --- Create Context ---
// Provide a default value that matches the type structure

// --- Create Auth Provider Component ---
// This wraps the RootLayout logic and provides the context
// --- Create Context ---
// Provide a default value that matches the type structure
const AuthContext = createContext<AuthContextType | undefined>(undefined);
// --- Create Auth Provider Component ---
// This wraps the RootLayout logic and provides the context
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [roles, setRoles] = useState<string[]>([]);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const { t } = useTranslation(); // Needed if used within handlers

  const clearAuthState = () => {
    setUser(null);
    setRoles([]);
    setPermissions([]);
    authService.removeToken(); // Ensure token is removed on clear
  };

  const checkAuthStatus = useCallback(async () => {
    console.log("AuthProvider: Checking authentication status...");
    // Don't necessarily set loading true on every check, only initial?
    // setIsLoading(true);
    try {
      // getCurrentUser now relies on token interceptor and returns full user object or null
      const currentUser = await authService.getCurrentUser();
      if (currentUser) {
        setUser(currentUser);
        setRoles(currentUser.roles || []); // Set roles from user object
        setPermissions(currentUser.permissions || []); // Set permissions
        console.log("AuthProvider: User authenticated", currentUser);
      } else {
        console.log("AuthProvider: No valid user session/token found.");
        clearAuthState(); // Clear state if no valid user
      }
    } catch (error) {
      // Should not happen if getCurrentUser handles errors gracefully
      console.error("AuthProvider: Error during auth check", error);
      clearAuthState();
    } finally {
      setIsLoading(false); // Finish loading check
    }
  }, []); // Empty dependency array for stable callback

  useEffect(() => {
    setIsLoading(true); // Set loading true only on initial mount
    checkAuthStatus();
  }, [checkAuthStatus]); // Run only once on mount

  const handleLoginSuccess = (authResponse: AuthResponse) => {
    console.log("AuthProvider: Login successful", authResponse);
    setUser(authResponse.user);
    // Extract roles/permissions from response. If they are nested in user object, adjust accordingly
    setRoles(authResponse.roles || authResponse.user.roles || []);
    setPermissions(
      authResponse.permissions || authResponse.user.permissions || []
    );
    // Token is already stored by authService.login
    navigate("/dashboard", { replace: true }); // Or intended destination
  };

  const handleRegisterSuccess = (authResponse: AuthResponse) => {
    console.log("AuthProvider: Register successful", authResponse);
    setUser(authResponse.user);
    setRoles(authResponse.roles || authResponse.user.roles || []);
    setPermissions(
      authResponse.permissions || authResponse.user.permissions || []
    );
    // Token stored by authService.register
    navigate("/dashboard", { replace: true });
  };

  const handleLogout = async () => {
    console.log("AuthProvider: Logging out...");
    try {
      await authService.logout(); // Service calls API and removes token
    } catch (error) {
      console.error(
        "Logout API call failed (token likely removed anyway):",
        error
      );
      // Optionally show toast error
    } finally {
      clearAuthState(); // Clear user, roles, permissions
      navigate("/login"); // Redirect to login
      console.log("AuthProvider: Logout complete.");
    }
  };

  // Value provided by the context
  const value = {
    user,
    isLoading,
    roles,
    permissions,
    checkAuthStatus,
    handleLoginSuccess,
    handleRegisterSuccess,
    handleLogout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
// --- Custom Hook to use the Auth Context ---
export const useAuth = (): AuthContextType => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

// --- Custom Hook to use the Auth Context ---
