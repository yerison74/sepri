/**
 * Query en /contratista/:id para vista con acciones (asignar / seguimiento).
 * Los enlaces del QR no incluyen este parámetro → solo lectura.
 */
export const CONTRATISTA_DETALLE_Q_FROM = 'from';
export const CONTRATISTA_DETALLE_Q_FROM_APP = 'app';

export function hrefContratistaDetalleDesdeApp(id: string): string {
  const q = new URLSearchParams();
  q.set(CONTRATISTA_DETALLE_Q_FROM, CONTRATISTA_DETALLE_Q_FROM_APP);
  return `/contratista/${encodeURIComponent(id)}?${q.toString()}`;
}

export function esContratistaDetalleDesdeApp(search: string): boolean {
  return new URLSearchParams(search).get(CONTRATISTA_DETALLE_Q_FROM) === CONTRATISTA_DETALLE_Q_FROM_APP;
}

/** URL absoluta para código QR (sin `?from=app`): abre el detalle en solo lectura tras login si aplica. */
export function urlAbsolutaDetalleContratista(id: string): string {
  return `${window.location.origin}/contratista/${encodeURIComponent(id)}`;
}

/** Imagen del QR (servicio externo) apuntando al detalle público de la solicitud. */
export function urlImagenQrDetalleContratista(id: string, sizePx = 260): string {
  const data = urlAbsolutaDetalleContratista(id);
  return `https://api.qrserver.com/v1/create-qr-code/?size=${sizePx}x${sizePx}&data=${encodeURIComponent(data)}`;
}
