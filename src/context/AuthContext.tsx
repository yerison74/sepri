import { createContext, useContext, useState, useCallback } from 'react';

const STORAGE_KEY = 'sepri_user';

const readStoredUser = (): any => {
  try {
    const s = localStorage.getItem(STORAGE_KEY);
    return s ? JSON.parse(s) : null;
  } catch {
    return null;
  }
};

const saveUser = (usuario: any) => {
  try {
    if (!usuario) {
      localStorage.removeItem(STORAGE_KEY);
      return;
    }
    const { password, ...rest } = usuario;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(password !== undefined ? rest : usuario));
  } catch {
    localStorage.removeItem(STORAGE_KEY);
  }
};

const AuthContext = createContext<any>(null);

export const AuthProvider = ({ children }: any) => {
  const [user, setUser] = useState<any>(() => readStoredUser());

  const login = useCallback((usuario: any) => {
    saveUser(usuario);
    setUser(usuario);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setUser(null);
  }, []);

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