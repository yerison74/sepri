import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
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
const MODULOS_PERMISOS = [
  { id: 'dashboard', label: 'Dashboard', icon: '📊', verKey: 'ver_dashboard', editarKey: 'editar_dashboard' },
  { id: 'obras', label: 'Obras', icon: '🏗️', verKey: 'ver_obras', editarKey: 'editar_obras' },
  { id: 'carga_obras', label: 'Carga de Obras', icon: '📋', verKey: 'ver_carga_obras', editarKey: 'editar_carga_obras' },
  { id: 'tramites', label: 'Seguimiento de Trámite', icon: '📄', verKey: 'ver_tramites', editarKey: 'editar_tramites' },
  { id: 'atencion_contratista', label: 'Atención al contratista', icon: '🧑‍💼', verKey: 'ver_atencion_contratista', editarKey: 'editar_atencion_contratista' },
  { id: 'configuracion', label: 'Configuración', icon: '⚙️', verKey: 'ver_configuracion', editarKey: 'editar_configuracion' },
] as const;

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

  const actualizarPermiso = (key: string, enabled: boolean) => {
    setForm({
      ...form,
      permisos: { ...(form.permisos || {}), [key]: enabled },
    });
  };

  const cambiarPermisoModulo = (
    verKey: string,
    editarKey: string,
    tipo: 'ver' | 'editar',
    enabled: boolean
  ) => {
    const permisosActuales = { ...(form.permisos || {}) };
    if (tipo === 'ver') {
      permisosActuales[verKey] = enabled;
      if (!enabled) permisosActuales[editarKey] = false;
    } else {
      permisosActuales[editarKey] = enabled;
      if (enabled) permisosActuales[verKey] = true;
    }
    setForm({ ...form, permisos: permisosActuales });
  };

  const seleccionarTodosPermisos = () => {
    const allKeys = MODULOS_PERMISOS.flatMap((m) => [m.verKey, m.editarKey]);
    const todosSeleccionados = allKeys.every((key) => form.permisos?.[key]);
    const nuevosPermisos: any = {};
    allKeys.forEach((key) => {
      nuevosPermisos[key] = !todosSeleccionados;
    });
    setForm({ ...form, permisos: nuevosPermisos });
  };

  const totalPermisos = MODULOS_PERMISOS.length * 2;
  const permisosSeleccionados = MODULOS_PERMISOS.flatMap((m) => [m.verKey, m.editarKey]).filter(
    (key) => form.permisos?.[key]
  ).length;

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
                  onChange={(e) => {
                    const newRol = e.target.value;
                    const updates = { ...form, rol: newRol };
                    if (newRol === 'admin') {
                      const todosPermisos: Record<string, boolean> = {};
                      MODULOS_PERMISOS.forEach((m) => {
                        todosPermisos[m.verKey] = true;
                        todosPermisos[m.editarKey] = true;
                      });
                      updates.permisos = todosPermisos;
                    }
                    setForm(updates);
                  }}
                  label="Rol del Usuario"
                >
                  <MenuItem value="admin">Administrador</MenuItem>
                  <MenuItem value="supervision">Supervisión</MenuItem>
                  <MenuItem value="usuario">Usuario</MenuItem>
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
                label={`${permisosSeleccionados}/${totalPermisos}`}
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
              {permisosSeleccionados === totalPermisos ? 'Deseleccionar Todo' : 'Seleccionar Todo'}
            </Button>
          </Box>

          <Stack spacing={1.25}>
            {MODULOS_PERMISOS.map((m) => {
              const canView = !!form.permisos?.[m.verKey];
              const canEdit = !!form.permisos?.[m.editarKey];
              return (
                <Paper
                  key={m.id}
                  variant="outlined"
                  sx={{
                    px: 1.5,
                    py: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: 1,
                  }}
                >
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {m.icon} {m.label}
                  </Typography>
                  <Stack direction="row" spacing={2} alignItems="center">
                    <FormControlLabel
                      control={
                        <Switch
                          checked={canView}
                          onChange={(e) => cambiarPermisoModulo(m.verKey, m.editarKey, 'ver', e.target.checked)}
                          color="primary"
                        />
                      }
                      label="Ver"
                    />
                    <FormControlLabel
                      control={
                        <Switch
                          checked={canEdit}
                          onChange={(e) => cambiarPermisoModulo(m.verKey, m.editarKey, 'editar', e.target.checked)}
                          color="secondary"
                        />
                      }
                      label="Editar"
                    />
                  </Stack>
                </Paper>
              );
            })}

          </Stack>
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
