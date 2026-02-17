import React, { useState, useEffect } from 'react';
import {
  Dashboard,
  Assignment,
  CloudUpload,
  Settings,
  FollowTheSigns,
  Logout,
  Person,
} from '@mui/icons-material';
import FileUpload from './components/FileUpload';
import StatsDashboard from './components/StatsDashboard';
import ObrasTable from './components/ObrasTable';
import TramiteHistory from './components/UploadHistory';
import Login from './components/Login';
import { useAuth } from './context/AuthContext';
import { TAB_PERMISOS } from './constants/permisos';
import GestionUsuarios from './components/GestionUsuarios';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
    >
      {value === index && (
        <div className="p-2 sm:p-3 md:p-4 lg:p-6">
          {children}
        </div>
      )}
    </div>
  );
}

function App() {
  const { user, loading, logout, hasPermission } = useAuth();
  const tramitesOnly = false;
  const [tabValue, setTabValue] = useState(0);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleTabChange = (newValue: number) => {
    setTabValue(newValue);
  };

  const handleUploadComplete = () => {
    setRefreshTrigger((prev) => prev + 1);
    if (!tramitesOnly) setTabValue(1);
  };

  const allTabs = [
    { icon: <Dashboard />, label: 'Dashboard', index: 0 },
    { icon: <Assignment />, label: 'Obras', index: 1 },
    { icon: <CloudUpload />, label: 'Cargar Obras', index: 2 },
    { icon: <FollowTheSigns />, label: 'Seguimiento de Trámites', index: 3 },
    { icon: <Settings />, label: 'Configuración', index: 4 },
  ];

  // Solo mostrar pestañas para las que el usuario tiene permiso
  const tabs = tramitesOnly
    ? allTabs.filter((tab) => tab.index === 3)
    : allTabs.filter((tab) => hasPermission(TAB_PERMISOS[tab.index as keyof typeof TAB_PERMISOS]));

  // Al tener usuario, ir a la primera pestaña que tiene permiso (login o recarga)
  const allowedTabIndices = tabs.map((t) => t.index).join(',');
  useEffect(() => {
    if (!user || tabs.length === 0) return;
    const allowedSet = new Set(tabs.map((t) => t.index));
    setTabValue((prev) => (allowedSet.has(prev) ? prev : tabs[0].index));
  }, [user?.id, allowedTabIndices]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-[#42A5F5]" />
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-[#42A5F5] text-white shadow-md">
        <div className="px-2 sm:px-3 md:px-4 py-2 sm:py-3">
          <div className="flex items-center">
            {tramitesOnly ? (
              <FollowTheSigns className="mr-2 sm:mr-3 text-xl sm:text-2xl" />
            ) : (
              <Assignment className="mr-2 sm:mr-3 text-xl sm:text-2xl" />
            )}
            <h1 className="text-base sm:text-lg md:text-xl font-semibold flex-grow">
              {tramitesOnly
                ? 'Sistema de Seguimiento de Trámites'
                : 'Sistema de Gestión de Mantenimientos'}
            </h1>
            <div className="flex items-center gap-2">
              <span className="hidden sm:inline text-sm flex items-center gap-1">
                <Person fontSize="small" />
                {user.nombre} {user.apellido}
              </span>
              <button
                type="button"
                onClick={logout}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-sm font-medium"
                title="Cerrar sesión"
              >
                <Logout fontSize="small" />
                <span className="hidden sm:inline">Salir</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="px-1 sm:px-2 md:px-3 lg:px-4 py-2 sm:py-3 md:py-4 w-full">
        <div className="bg-white rounded-lg shadow-lg w-full">
          {(!tramitesOnly || tabs.length > 1) && tabs.length > 0 && (
            <div className="border-b border-gray-200 overflow-x-auto">
              <div className="flex flex-nowrap min-w-full" role="tablist" aria-label="navigation tabs">
                {tabs.map((tab) => (
                  <button
                    key={tab.index}
                    onClick={() => handleTabChange(tab.index)}
                    role="tab"
                    aria-selected={tabValue === tab.index}
                    aria-controls={`simple-tabpanel-${tab.index}`}
                    id={`simple-tab-${tab.index}`}
                    className={`
                      flex items-center gap-1 sm:gap-2 px-2 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4 font-medium text-xs sm:text-sm
                      transition-colors duration-200 whitespace-nowrap
                      border-b-2 border-transparent
                      ${
                        tabValue === tab.index
                          ? 'text-[#42A5F5] border-[#42A5F5] bg-blue-50'
                          : 'text-gray-600 hover:text-[#42A5F5] hover:bg-gray-50'
                      }
                    `}
                  >
                    <span className="text-base sm:text-lg">{tab.icon}</span>
                    <span className="hidden sm:inline">{tab.label}</span>
                    <span className="sm:hidden">{tab.label.split(' ')[0]}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {!tramitesOnly && (
            <>
              {hasPermission('ver_dashboard') && (
                <TabPanel value={tabValue} index={0}>
                  <StatsDashboard
                    refreshTrigger={refreshTrigger}
                    onEstadoClick={(estado: string) => {
                      window.dispatchEvent(new CustomEvent('setObrasFilters', { detail: { estado } }));
                      setTabValue(1);
                    }}
                    onProvinciaClick={(provincia: string) => {
                      window.dispatchEvent(new CustomEvent('setObrasFilters', { detail: { provincia } }));
                      setTabValue(1);
                    }}
                  />
                </TabPanel>
              )}

              {hasPermission('ver_obras') && (
                <TabPanel value={tabValue} index={1}>
                  <ObrasTable refreshTrigger={refreshTrigger} />
                </TabPanel>
              )}

              {hasPermission('ver_carga_obras') && (
                <TabPanel value={tabValue} index={2}>
                  <FileUpload
                    onUploadComplete={handleUploadComplete}
                    onError={(error: unknown) => console.error('Upload error:', error)}
                    soloLectura={!hasPermission('editar_carga_obras')}
                  />
                </TabPanel>
              )}

              {hasPermission('ver_configuracion') && (
                <TabPanel value={tabValue} index={4}>
                  <div>
                    <h2 className="text-2xl font-semibold mb-4 text-gray-800">
                      Configuración del Sistema
                    </h2>
                    <GestionUsuarios />
                  </div>
                </TabPanel>
              )}
            </>
          )}

          {hasPermission('ver_tramites') && (
            <TabPanel value={tabValue} index={3}>
              <TramiteHistory soloLectura={!hasPermission('editar_tramites')} />
            </TabPanel>
          )}

          {tabs.length === 0 && (
            <div className="p-8 text-center text-gray-500">
              No tienes permisos para acceder a ninguna sección. Contacta al administrador.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
