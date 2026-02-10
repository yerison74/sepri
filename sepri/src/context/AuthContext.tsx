import { createContext, useContext, useState } from 'react';

const AuthContext = createContext<any>(null);

export const AuthProvider = ({ children }: any) => {
  const [user, setUser] = useState<any>(null);

  const login = (usuario: any) => setUser(usuario);
  const logout = () => setUser(null);

  const hasPermission = (permiso: string) => {
    if (!user) return false;
    if (user.rol === 'admin') return true;
    return !!user.permisos?.[permiso];
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, hasPermission }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);