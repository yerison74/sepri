import React, { useState, useEffect, useRef } from 'react';
import { Notifications } from '@mui/icons-material';
import { tramitesAPI } from '../services/api';
import type { NotificacionTiempo } from '../types/database';

interface NotificacionesTiempoProps {
  /** Área del usuario logueado (donde corre el proceso). Solo se muestran notificaciones de esta área. */
  areaUsuario: string | null | undefined;
  /** ID del usuario logueado para filtrar y marcar notificaciones leídas. */
  usuarioId?: string | null;
  /** Si true, al abrir el panel se evalúa el tiempo y se crean notificaciones 50/70/100% antes de cargar. */
  evaluarAlAbrir?: boolean;
}

export default function NotificacionesTiempo({
  areaUsuario,
  usuarioId,
  evaluarAlAbrir = true,
}: NotificacionesTiempoProps) {
  const [notificaciones, setNotificaciones] = useState<NotificacionTiempo[]>([]);
  const [abierto, setAbierto] = useState(false);
  const [cargando, setCargando] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const cargar = async (ejecutarEvaluacion: boolean = false) => {
    if (!areaUsuario?.trim()) {
      setNotificaciones([]);
      return;
    }
    setCargando(true);
    try {
      if (ejecutarEvaluacion) {
        await tramitesAPI.evaluarNotificacionesTiempo();
      }
      const res = await tramitesAPI.obtenerNotificacionesTiempo(areaUsuario, usuarioId ?? undefined);
      setNotificaciones(res?.data?.data ?? []);
    } catch {
      setNotificaciones([]);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargar(false);
  }, [areaUsuario, usuarioId]);

  const prevAbierto = useRef(false);
  useEffect(() => {
    if (abierto && !prevAbierto.current && areaUsuario?.trim() && evaluarAlAbrir) {
      cargar(true);
    }
    prevAbierto.current = abierto;
  }, [abierto, areaUsuario, evaluarAlAbrir]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setAbierto(false);
    };
    if (abierto) document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [abierto]);

  if (!areaUsuario?.trim()) return null;

  const handleClickNotificacion = async (n: NotificacionTiempo) => {
    try {
      if (usuarioId) {
        await tramitesAPI.marcarNotificacionTiempoLeida(n.id, usuarioId);
      }
    } catch {
      // Ignorar errores al marcar como leída para no bloquear la UX
    }

    setNotificaciones((prev) => prev.filter((x) => x.id !== n.id));
    setAbierto(false);

    window.dispatchEvent(
      new CustomEvent('openTramiteDesdeNotificacion', {
        detail: { tramiteId: n.tramite_id },
      }),
    );
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setAbierto((o) => !o)}
        className="relative inline-flex items-center justify-center w-10 h-10 rounded-full bg-white/15 hover:bg-white/30 border border-white/20 hover:border-white/35 transition-all duration-200 shadow-sm hover:shadow"
        title="Notificaciones por tiempo del trámite"
        aria-label="Notificaciones"
      >
        <Notifications sx={{ fontSize: 22 }} className="text-white" />
        {notificaciones.length > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[20px] h-5 rounded-full bg-red-500 text-white text-xs font-semibold flex items-center justify-center px-1.5 ring-2 ring-[#1976D2]">
            {notificaciones.length > 99 ? '99+' : notificaciones.length}
          </span>
        )}
      </button>
      {abierto && (
        <div className="absolute right-0 top-full mt-1 w-[360px] max-w-[calc(100vw-2rem)] max-h-[70vh] overflow-hidden bg-white rounded-lg shadow-xl border border-gray-200 z-50">
          <div className="px-3 py-2 border-b border-gray-200 bg-gray-50 font-semibold text-gray-800">
            Notificaciones de trámites (tiempo)
          </div>
          <div className="overflow-y-auto max-h-[60vh]">
            {cargando ? (
              <div className="p-4 text-center text-gray-500 text-sm">Cargando...</div>
            ) : notificaciones.length === 0 ? (
              <div className="p-4 text-center text-gray-500 text-sm">
                No hay notificaciones para tu área.
              </div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {notificaciones.map((n) => (
                  <li
                    key={n.id}
                    className="px-3 py-2.5 hover:bg-gray-50 cursor-pointer"
                    onClick={() => handleClickNotificacion(n)}
                  >
                    <div className="flex items-start gap-2">
                      <span
                        className={`shrink-0 mt-0.5 w-2 h-2 rounded-full ${
                          n.porcentaje === 100
                            ? 'bg-red-500'
                            : n.porcentaje === 70
                            ? 'bg-amber-500'
                            : 'bg-blue-500'
                        }`}
                        title={`${n.porcentaje}% del tiempo`}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-gray-800">{n.mensaje}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {n.tramite_titulo} · {new Date(n.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
