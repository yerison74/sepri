import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Grid,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { formularioContratistaAPI } from '../services/api';

const MOTIVOS_VISITA = [
  'Adenda',
  'Contrato',
  'Equilibrio economico',
  'Linea de credito',
  'Pago de cubicación',
  'Mantenimiento Correctivo',
  'Aula movil',
  'Otras',
] as const;

const PROVINCIAS_RD = [
  'Azua',
  'Bahoruco',
  'Barahona',
  'Dajabón',
  'Distrito Nacional',
  'Duarte',
  'Elías Piña',
  'El Seibo',
  'Espaillat',
  'Hato Mayor',
  'Hermanas Mirabal',
  'Independencia',
  'La Altagracia',
  'La Romana',
  'La Vega',
  'María Trinidad Sánchez',
  'Monseñor Nouel',
  'Monte Cristi',
  'Monte Plata',
  'Pedernales',
  'Peravia',
  'Puerto Plata',
  'Samaná',
  'San Cristóbal',
  'San José de Ocoa',
  'San Juan',
  'San Pedro de Macorís',
  'Sánchez Ramírez',
  'Santiago',
  'Santiago Rodríguez',
  'Santo Domingo',
  'Valverde',
] as const;

type FormState = {
  fecha_visita: string;
  nombres: string;
  apellidos: string;
  nombre_empresa: string;
  motivo_visita: string;
  nombre_obra: string;
  nombre_obra_inaugurada: string;
  provincia: string;
  numero_contrato: string;
  correo: string;
  nota: string;
};

type RegistroContratista = FormState & { id: string };

const initialForm: FormState = {
  fecha_visita: new Date().toISOString().split('T')[0],
  nombres: '',
  apellidos: '',
  nombre_empresa: '',
  motivo_visita: '',
  nombre_obra: '',
  nombre_obra_inaugurada: '',
  provincia: '',
  numero_contrato: '',
  correo: '',
  nota: '',
};

function solicitudContratistaDetailUrl(id: string) {
  return `${window.location.origin}/contratista/${encodeURIComponent(id)}`;
}

export default function AtencionContratista() {
  const navigate = useNavigate();
  const [form, setForm] = useState<FormState>(initialForm);
  const [registros, setRegistros] = useState<RegistroContratista[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingRegistros, setLoadingRegistros] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [qrData, setQrData] = useState<RegistroContratista | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const canSubmit = useMemo(() => {
    return (
      form.fecha_visita &&
      form.nombres.trim() &&
      form.apellidos.trim() &&
      form.nombre_empresa.trim() &&
      form.motivo_visita &&
      form.provincia &&
      form.numero_contrato.trim() &&
      form.correo.trim()
    );
  }, [form]);

  const cargarRegistros = async () => {
    setLoadingRegistros(true);
    try {
      const resp = await formularioContratistaAPI.obtener(20);
      setRegistros((resp.data.data as RegistroContratista[]) || []);
    } catch (e: any) {
      setError(e?.response?.data?.error || 'No se pudieron cargar los registros.');
    } finally {
      setLoadingRegistros(false);
    }
  };

  useEffect(() => {
    cargarRegistros();
  }, []);

  const handleChange =
    (field: keyof FormState) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setForm((prev) => ({ ...prev, [field]: event.target.value }));
    };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      const resp = await formularioContratistaAPI.crear({
        ...form,
        nombre_obra: form.nombre_obra.trim() || null,
        nombre_obra_inaugurada: form.nombre_obra_inaugurada.trim() || null,
        nota: form.nota.trim() || null,
      });
      const creado = resp.data.data as RegistroContratista;
      setSuccess('Formulario guardado correctamente.');
      setQrData(creado);
      setShowForm(false);
      setForm({ ...initialForm, fecha_visita: form.fecha_visita });
      await cargarRegistros();
    } catch (e: any) {
      setError(e?.response?.data?.error || 'No se pudo guardar el formulario.');
    } finally {
      setLoading(false);
    }
  };

  /** URL interna de la app: al escanear se abre la vista de detalle de la solicitud. */
  const qrDetailUrl = useMemo(() => {
    if (!qrData) return '';
    return solicitudContratistaDetailUrl(qrData.id);
  }, [qrData]);

  const qrImageUrl = useMemo(() => {
    if (!qrDetailUrl) return '';
    return `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(qrDetailUrl)}`;
  }, [qrDetailUrl]);

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h4" sx={{ fontWeight: 600, mb: 2, color: 'primary.main' }}>
        Atención al contratista
      </Typography>
      <Typography variant="body1" sx={{ color: 'text.secondary', mb: 3 }}>
        Registro de visitas y requerimientos de contratistas.
      </Typography>

      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          Solicitudes de contratista
        </Typography>
        <Button
          variant={showForm ? 'outlined' : 'contained'}
          onClick={() => {
            setError(null);
            setSuccess(null);
            setShowForm((prev) => !prev);
          }}
        >
          {showForm ? 'Ocultar formulario' : 'Nueva solicitud'}
        </Button>
      </Stack>

      {showForm && (
        <Paper elevation={2} sx={{ p: 3, borderRadius: 2, mb: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
            Nueva solicitud
          </Typography>

          <Box component="form" onSubmit={handleSubmit}>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField
                label="Fecha de visita"
                type="date"
                fullWidth
                required
                value={form.fecha_visita}
                onChange={handleChange('fecha_visita')}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField label="Nombres" fullWidth required value={form.nombres} onChange={handleChange('nombres')} />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField label="Apellidos" fullWidth required value={form.apellidos} onChange={handleChange('apellidos')} />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField label="Nombre empresa" fullWidth required value={form.nombre_empresa} onChange={handleChange('nombre_empresa')} />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                select
                label="Motivo visita"
                fullWidth
                required
                value={form.motivo_visita}
                onChange={handleChange('motivo_visita')}
              >
                {MOTIVOS_VISITA.map((motivo) => (
                  <MenuItem key={motivo} value={motivo}>
                    {motivo}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField label="Nombre obra (opcional)" fullWidth value={form.nombre_obra} onChange={handleChange('nombre_obra')} />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                label="Nombre obra inaugurada (opcional)"
                fullWidth
                value={form.nombre_obra_inaugurada}
                onChange={handleChange('nombre_obra_inaugurada')}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField
                select
                label="Provincia"
                fullWidth
                required
                value={form.provincia}
                onChange={handleChange('provincia')}
              >
                {PROVINCIAS_RD.map((provincia) => (
                  <MenuItem key={provincia} value={provincia}>
                    {provincia}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField
                label="Numero contrato"
                fullWidth
                required
                value={form.numero_contrato}
                onChange={handleChange('numero_contrato')}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField
                label="Correo"
                type="email"
                fullWidth
                required
                value={form.correo}
                onChange={handleChange('correo')}
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField label="Nota" fullWidth multiline minRows={3} value={form.nota} onChange={handleChange('nota')} />
            </Grid>
          </Grid>

            <Stack direction="row" justifyContent="flex-end" sx={{ mt: 2 }}>
              <Button type="submit" variant="contained" disabled={!canSubmit || loading}>
                {loading ? 'Guardando...' : 'Guardar formulario'}
              </Button>
            </Stack>
          </Box>
        </Paper>
      )}

      {(error || success) && (
        <Stack spacing={1} sx={{ mb: 2 }}>
          {error && <Alert severity="error">{error}</Alert>}
          {success && <Alert severity="success">{success}</Alert>}
        </Stack>
      )}

      {qrData && (
        <Paper elevation={2} sx={{ p: 3, borderRadius: 2, mb: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
            QR de la solicitud {qrData.id}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Escanea el QR para abrir la vista de detalle de esta solicitud en el sistema (debes iniciar sesión si aplica).
          </Typography>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ xs: 'flex-start', md: 'center' }}>
            <Box
              component="img"
              src={qrImageUrl}
              alt={`QR solicitud ${qrData.id}`}
              sx={{ width: 200, height: 200, border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 1, bgcolor: 'white' }}
            />
            <Box>
              <Typography variant="body2" sx={{ mb: 1, wordBreak: 'break-all' }}>
                <strong>Enlace:</strong> {qrDetailUrl}
              </Typography>
              <Typography variant="body2"><strong>Nombre:</strong> {qrData.nombres} {qrData.apellidos}</Typography>
              <Typography variant="body2"><strong>Empresa:</strong> {qrData.nombre_empresa}</Typography>
              <Typography variant="body2"><strong>Motivo:</strong> {qrData.motivo_visita}</Typography>
              <Typography variant="body2"><strong>Provincia:</strong> {qrData.provincia}</Typography>
              <Button
                variant="outlined"
                size="small"
                sx={{ mt: 1.5 }}
                onClick={() => navigate(`/contratista/${encodeURIComponent(qrData.id)}`)}
              >
                Ver solicitud en pantalla
              </Button>
            </Box>
          </Stack>
        </Paper>
      )}

      <Paper elevation={1} sx={{ p: 2, borderRadius: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
          Registros recientes
        </Typography>
        {loadingRegistros ? (
          <Typography variant="body2" color="text.secondary">
            Cargando registros...
          </Typography>
        ) : registros.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No hay registros todavía.
          </Typography>
        ) : (
          <Stack spacing={1.5}>
            {registros.map((r) => (
              <Paper
                key={r.id}
                variant="outlined"
                role="button"
                tabIndex={0}
                onClick={() => navigate(`/contratista/${encodeURIComponent(r.id)}`)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    navigate(`/contratista/${encodeURIComponent(r.id)}`);
                  }
                }}
                sx={{
                  p: 1.5,
                  cursor: 'pointer',
                  '&:hover': { bgcolor: 'action.hover' },
                }}
              >
                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                  {r.id} - {r.nombres} {r.apellidos}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {r.fecha_visita} | {r.nombre_empresa} | {r.motivo_visita} | {r.provincia}
                </Typography>
              </Paper>
            ))}
          </Stack>
        )}
      </Paper>
    </Box>
  );
}

