import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Alert, Button, CircularProgress, Paper, Typography } from '@mui/material';
import { ArrowBack } from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import Login from './Login';
import { formularioContratistaAPI } from '../services/api';
import type { FormularioContratista } from '../types/database';

const REDIRECT_KEY = 'redirectAfterLogin';

/** Ruta dedicada: /contratista/:id — detalle de una solicitud (mismo permiso que el módulo). */
export default function SolicitudContratistaDetalle() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading, hasPermission } = useAuth();
  const [registro, setRegistro] = useState<FormularioContratista | null | undefined>(undefined);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user && id) {
      try {
        sessionStorage.setItem(REDIRECT_KEY, `/contratista/${encodeURIComponent(id)}`);
      } catch {
        /* ignore */
      }
    }
  }, [authLoading, user, id]);

  useEffect(() => {
    if (authLoading || !user || !id) return;
    if (!hasPermission('ver_configuracion')) return;

    let cancelled = false;
    (async () => {
      setLoadError(null);
      setRegistro(undefined);
      try {
        const resp = await formularioContratistaAPI.obtenerPorId(id);
        if (!cancelled) setRegistro(resp.data.data);
      } catch (e: any) {
        if (!cancelled) {
          setLoadError(e?.response?.data?.error || 'No se pudo cargar la solicitud.');
          setRegistro(null);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
    // hasPermission depende del usuario; no incluirlo para evitar re-fetches innecesarios
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user?.id, id]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-warm-50 flex items-center justify-center">
        <CircularProgress />
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  if (!hasPermission('ver_configuracion')) {
    return (
      <div className="min-h-screen bg-warm-50 flex items-center justify-center p-4">
        <Paper sx={{ p: 4, maxWidth: 480 }}>
          <Alert severity="warning" sx={{ mb: 2 }}>
            No tienes permiso para ver solicitudes de contratista.
          </Alert>
          <Button variant="contained" onClick={() => navigate('/', { replace: true })}>
            Ir al inicio
          </Button>
        </Paper>
      </div>
    );
  }

  if (!id) {
    return (
      <div className="min-h-screen bg-warm-50 flex items-center justify-center p-4">
        <Alert severity="error">Identificador de solicitud no válido.</Alert>
      </div>
    );
  }

  if (registro === undefined) {
    return (
      <div className="min-h-screen bg-warm-50 flex items-center justify-center">
        <CircularProgress />
      </div>
    );
  }

  if (loadError || registro === null) {
    return (
      <div className="min-h-screen bg-warm-50 flex flex-col items-center justify-center gap-4 p-4">
        <Alert severity="error">{loadError || 'Solicitud no encontrada.'}</Alert>
        <Button startIcon={<ArrowBack />} variant="outlined" onClick={() => navigate('/', { replace: true })}>
          Ir al inicio
        </Button>
      </div>
    );
  }

  const r = registro;

  return (
    <div className="min-h-screen bg-warm-50 flex flex-col">
      <header className="bg-white border-b border-warm-200 shadow-soft px-4 py-3 flex items-center gap-3">
        <Button startIcon={<ArrowBack />} onClick={() => navigate(-1)} size="small">
          Volver
        </Button>
        <Typography variant="h6" component="h1" sx={{ fontWeight: 600, flex: 1 }}>
          Solicitud {r.id}
        </Typography>
      </header>
      <main className="flex-1 p-4 overflow-auto">
        <Paper elevation={2} sx={{ p: 3, maxWidth: 720, mx: 'auto', borderRadius: 2 }}>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            Fecha de visita
          </Typography>
          <Typography variant="body1" sx={{ mb: 2 }}>
            {r.fecha_visita}
          </Typography>

          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            Visitante
          </Typography>
          <Typography variant="body1" sx={{ mb: 2 }}>
            {r.nombres} {r.apellidos}
          </Typography>

          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            Empresa
          </Typography>
          <Typography variant="body1" sx={{ mb: 2 }}>
            {r.nombre_empresa}
          </Typography>

          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            Motivo de visita
          </Typography>
          <Typography variant="body1" sx={{ mb: 2 }}>
            {r.motivo_visita}
          </Typography>

          {r.nombre_obra ? (
            <>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Nombre obra
              </Typography>
              <Typography variant="body1" sx={{ mb: 2 }}>
                {r.nombre_obra}
              </Typography>
            </>
          ) : null}

          {r.nombre_obra_inaugurada ? (
            <>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Obra inaugurada
              </Typography>
              <Typography variant="body1" sx={{ mb: 2 }}>
                {r.nombre_obra_inaugurada}
              </Typography>
            </>
          ) : null}

          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            Provincia
          </Typography>
          <Typography variant="body1" sx={{ mb: 2 }}>
            {r.provincia}
          </Typography>

          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            Número de contrato
          </Typography>
          <Typography variant="body1" sx={{ mb: 2 }}>
            {r.numero_contrato}
          </Typography>

          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            Correo
          </Typography>
          <Typography variant="body1" sx={{ mb: 2 }}>
            {r.correo}
          </Typography>

          {r.nota ? (
            <>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Nota
              </Typography>
              <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                {r.nota}
              </Typography>
            </>
          ) : null}
        </Paper>
      </main>
    </div>
  );
}
