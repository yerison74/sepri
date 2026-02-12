import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  Checkbox,
  FormControlLabel,
  Button,
  Typography,
  Box,
  Divider,
  FormControl,
  InputLabel,
  Switch,
  Paper,
  Chip,
  CircularProgress,
  Stack
} from '@mui/material';
import { CARGOS } from '../../constants/cargos';
import { 
  Person as PersonIcon,
  Lock as LockIcon,
  Work as WorkIcon,
  Security as SecurityIcon,
  VpnKey as VpnKeyIcon
} from '@mui/icons-material';

const PERMISOS = [
  { key: 'crear_usuarios', label: 'Creación de usuarios', icon: '👥' },
  { key: 'editar_usuarios', label: 'Edición de usuarios', icon: '✏️' },
  { key: 'ver_dashboard', label: 'Visualización del Dashboard', icon: '📊' },
  { key: 'ver_obras', label: 'Visualización de Obras', icon: '🏗️' },
  { key: 'ver_carga_obras', label: 'Visualización de Carga de Obras', icon: '📋' },
  { key: 'editar_carga_obras', label: 'Carga y edición en Carga de Obras', icon: '📝' },
  { key: 'ver_tramites', label: 'Visualización de Seguimiento de Trámite', icon: '📄' },
  { key: 'editar_tramites', label: 'Creación y seguimiento de Trámites', icon: '✅' },
  { key: 'ver_configuracion', label: 'Visualización de Configuración', icon: '⚙️' },
];

const AREAS = [
  'Ninguna',
  'Dirección General',
  'Oficina de Libre Acceso a la Información Pública',
  'Departamento Jurídico',
  'Departamento de Recursos Humanos',
  'Departamento de Planificación y Desarrollo',
  'División Control de Gestión Interna',
  'División de Seguridad',
  'División de Tecnologías de la Información y Comunicación',
  'Departamento Administrativo y Financiero',
  'Departamento de Diseño y Arquitectura',
  'Departamento de Gestión de Infraestructura Escolar',
  'Departamento Gestión de Riesgo',
  'Departamento de Mantenimiento de Obras',
  'Departamento Supervisión de Obras',
  'Departamento Fiscalización de Obras',
  'Departamento de Cubicaciones',
  'Departamento de Coordinación Regional',
];

interface UsuarioModalProps {
  open: boolean;
  onClose: () => void;
  onSave: () => void;
  form: any;
  setForm: (form: any) => void;
  isEdit: boolean;
  loading?: boolean;
}

export default function UsuarioModal({ 
  open, 
  onClose, 
  onSave, 
  form, 
  setForm, 
  isEdit,
  loading = false 
}: UsuarioModalProps) {
  
  const togglePermiso = (key: string) => {
    setForm({
      ...form,
      permisos: { ...form.permisos, [key]: !form.permisos?.[key] },
    });
  };

  const seleccionarTodosPermisos = () => {
    const todosSeleccionados = PERMISOS.every(p => form.permisos?.[p.key]);
    const nuevosPermisos: any = {};
    PERMISOS.forEach(p => {
      nuevosPermisos[p.key] = !todosSeleccionados;
    });
    setForm({ ...form, permisos: nuevosPermisos });
  };

  const permisosSeleccionados = PERMISOS.filter(p => form.permisos?.[p.key]).length;

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      fullWidth 
      maxWidth="md"
      PaperProps={{
        sx: { borderRadius: 2 }
      }}
    >
      <DialogTitle sx={{ 
        bgcolor: 'primary.main', 
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        gap: 1
      }}>
        <PersonIcon />
        {isEdit ? 'Editar Usuario' : 'Nuevo Usuario'}
      </DialogTitle>

      <DialogContent sx={{ mt: 2 }}>
        {/* Información Personal */}
        <Paper elevation={0} sx={{ p: 2, mb: 3, bgcolor: 'grey.50', borderRadius: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <PersonIcon sx={{ mr: 1, color: 'primary.main' }} />
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Información Personal
            </Typography>
          </Box>
          <Stack spacing={2}>
            <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
              <TextField
                fullWidth
                label="Nombre"
                required
                value={form.nombre}
                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                variant="outlined"
              />
              <TextField
                fullWidth
                label="Apellido"
                required
                value={form.apellido}
                onChange={(e) => setForm({ ...form, apellido: e.target.value })}
                variant="outlined"
              />
            </Box>
          </Stack>
        </Paper>

        {/* Credenciales */}
        <Paper elevation={0} sx={{ p: 2, mb: 3, bgcolor: 'grey.50', borderRadius: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <LockIcon sx={{ mr: 1, color: 'primary.main' }} />
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Credenciales de Acceso
            </Typography>
          </Box>
          <Stack spacing={2}>
            <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
              <TextField
                fullWidth
                label="Nombre de Usuario"
                required
                value={form.usuario}
                onChange={(e) => setForm({ ...form, usuario: e.target.value })}
                variant="outlined"
                disabled={isEdit}
                helperText={isEdit ? "El nombre de usuario no se puede modificar" : ""}
              />
              <TextField
                fullWidth
                label={isEdit ? "Nueva Contraseña (dejar vacío para no cambiar)" : "Contraseña"}
                required={!isEdit}
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                variant="outlined"
              />
            </Box>
          </Stack>
        </Paper>

        {/* Información Laboral */}
        <Paper elevation={0} sx={{ p: 2, mb: 3, bgcolor: 'grey.50', borderRadius: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <WorkIcon sx={{ mr: 1, color: 'primary.main' }} />
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Información Laboral
            </Typography>
          </Box>
          <Stack spacing={2}>
            <FormControl fullWidth>
              <InputLabel>Cargo</InputLabel>
              <Select
                value={form.cargo || ''}
                onChange={(e) => setForm({ ...form, cargo: e.target.value })}
                label="Cargo"
              >
                <MenuItem value="">
                  <em>Sin especificar</em>
                </MenuItem>
                {CARGOS.map((c) => (
                  <MenuItem key={c} value={c}>
                    {c}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>Área</InputLabel>
              <Select
                value={form.area}
                onChange={(e) => setForm({ ...form, area: e.target.value })}
                label="Área"
              >
                {AREAS.map((a) => (
                  <MenuItem key={a} value={a}>
                    {a}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>
        </Paper>

        {/* Rol y Estado */}
        <Paper elevation={0} sx={{ p: 2, mb: 3, bgcolor: 'grey.50', borderRadius: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <SecurityIcon sx={{ mr: 1, color: 'primary.main' }} />
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Rol y Estado
            </Typography>
          </Box>
          <Stack spacing={2}>
            <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', sm: 'row' }, alignItems: 'center' }}>
              <FormControl fullWidth>
                <InputLabel>Rol del Usuario</InputLabel>
                <Select
                  value={form.rol}
                  onChange={(e) => setForm({ ...form, rol: e.target.value })}
                  label="Rol del Usuario"
                >
                  <MenuItem value="usuario">Usuario</MenuItem>
                  <MenuItem value="admin">Administrador</MenuItem>
                </Select>
              </FormControl>
              <Box sx={{ minWidth: { xs: '100%', sm: 'auto' } }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={form.activo}
                      onChange={(e) => setForm({ ...form, activo: e.target.checked })}
                      color="success"
                    />
                  }
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography>Usuario Activo</Typography>
                      <Chip 
                        label={form.activo ? 'Activo' : 'Inactivo'} 
                        color={form.activo ? 'success' : 'default'}
                        size="small"
                      />
                    </Box>
                  }
                />
              </Box>
            </Box>
          </Stack>
        </Paper>

        {/* Permisos */}
        <Paper elevation={0} sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2, flexWrap: 'wrap', gap: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <VpnKeyIcon sx={{ mr: 1, color: 'primary.main' }} />
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Permisos del Sistema
              </Typography>
              <Chip 
                label={`${permisosSeleccionados}/${PERMISOS.length}`}
                color="primary"
                size="small"
                sx={{ ml: 2 }}
              />
            </Box>
            <Button 
              size="small" 
              onClick={seleccionarTodosPermisos}
              variant="outlined"
            >
              {permisosSeleccionados === PERMISOS.length ? 'Deseleccionar Todo' : 'Seleccionar Todo'}
            </Button>
          </Box>

          <Box sx={{ 
            display: 'grid', 
            gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
            gap: 1
          }}>
            {PERMISOS.map((p) => (
              <Box key={p.key}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={!!form.permisos?.[p.key]}
                      onChange={() => togglePermiso(p.key)}
                      color="primary"
                    />
                  }
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <span>{p.icon}</span>
                      <Typography variant="body2">{p.label}</Typography>
                    </Box>
                  }
                  sx={{
                    border: '1px solid',
                    borderColor: form.permisos?.[p.key] ? 'primary.main' : 'grey.300',
                    borderRadius: 1,
                    p: 1,
                    m: 0,
                    width: '100%',
                    bgcolor: form.permisos?.[p.key] ? 'primary.light' : 'white',
                    transition: 'all 0.2s',
                    '&:hover': {
                      bgcolor: form.permisos?.[p.key] ? 'primary.light' : 'grey.50',
                    }
                  }}
                />
              </Box>
            ))}
          </Box>
        </Paper>
      </DialogContent>

      <Divider />

      <DialogActions sx={{ p: 2, gap: 1 }}>
        <Button 
          onClick={onClose} 
          variant="outlined"
          disabled={loading}
        >
          Cancelar
        </Button>
        <Button 
          variant="contained" 
          onClick={onSave}
          disabled={loading}
          startIcon={loading ? <CircularProgress size={20} /> : null}
        >
          {loading ? 'Guardando...' : (isEdit ? 'Guardar Cambios' : 'Crear Usuario')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
