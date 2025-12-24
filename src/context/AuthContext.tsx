//src/context/AuthContext.tsx
// --- Define Context Type ---

import authService, { AuthResponse, User } from "@/services/authService";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
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

  const clearAuthState = () => {
    setUser(null);
    setRoles([]);
    setPermissions([]);
    authService.removeToken(); // Ensure token is removed on clear
  };

  const checkAuthStatus = useCallback(async () => {
    console.log("AuthProvider: Checking authentication status...");
    try {
      // getCurrentUser now returns user with roles and permissions (same structure as login)
      const currentUser = await authService.getCurrentUser();
      if (currentUser) {
        console.log("AuthProvider: User data received:", {
          user: currentUser,
          roles: currentUser.roles,
          permissions: currentUser.permissions,
        });
        
        // Use same logic as handleLoginSuccess
        const userRoles = Array.isArray(currentUser.roles) 
          ? currentUser.roles 
          : (currentUser.roles ? [currentUser.roles] : []);
        const userPermissions = Array.isArray(currentUser.permissions)
          ? currentUser.permissions
          : (currentUser.permissions ? [currentUser.permissions] : []);
        
        setUser(currentUser);
        setRoles(userRoles);
        setPermissions(userPermissions);
        
        console.log("AuthProvider: User authenticated", {
          user: currentUser,
          roles: userRoles,
          permissions: userPermissions,
        });
      } else {
        console.log("AuthProvider: No valid user session/token found.");
        clearAuthState();
      }
    } catch (error) {
      console.error("AuthProvider: Error during auth check", error);
      clearAuthState();
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    setIsLoading(true); // Set loading true only on initial mount
    checkAuthStatus();
  }, [checkAuthStatus]); // Run only once on mount

  const handleLoginSuccess = (authResponse: AuthResponse) => {
    console.log("AuthProvider: Login successful", authResponse);
    setUser(authResponse.user);
    setRoles(authResponse.roles || authResponse.user.roles || []);
    setPermissions(
      authResponse.permissions || authResponse.user.permissions || []
    );
  };

  const handleRegisterSuccess = (authResponse: AuthResponse) => {
    console.log("AuthProvider: Register successful", authResponse);
    setUser(authResponse.user);
    setRoles(authResponse.roles || authResponse.user.roles || []);
    setPermissions(
      authResponse.permissions || authResponse.user.permissions || []
    );
    navigate("/dashboard", { replace: true });
  };

  const handleLogout = async () => {
    console.log("AuthProvider: Logging out...");
    try {
      await authService.logout();
    } catch (error) {
      console.error(
        "Logout API call failed (token likely removed anyway):",
        error
      );
    } finally {
      clearAuthState();
      navigate("/login");
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
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
