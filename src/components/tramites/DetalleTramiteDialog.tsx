import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  Chip,
  Button,
} from '@mui/material';
import { FollowTheSigns, Person } from '@mui/icons-material';
import type { Tramite } from '../../services/api';
import { getEstadoColor, getEstadoLabel } from '../../utils/estadoTramite';

interface DetalleTramiteDialogProps {
  open: boolean;
  onClose: () => void;
  tramite: Tramite | null;
  onVerHistorial: () => void;
}

const DetalleTramiteDialog: React.FC<DetalleTramiteDialogProps> = ({
  open,
  onClose,
  tramite,
  onVerHistorial,
}) => {
  if (!tramite) {
    return null;
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle
        sx={{
          pb: 2,
          borderBottom: '2px solid',
          borderColor: 'divider',
          backgroundColor: 'primary.main',
          color: 'white',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <FollowTheSigns />
          <Box sx={{ minWidth: 0 }}>
            <Typography
              variant="h6"
              component="div"
              sx={{
                fontWeight: 600,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              Detalle del Trámite
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.9, mt: 0.5 }}>
              {tramite.id} - {tramite.titulo}
            </Typography>
          </Box>
        </Box>
      </DialogTitle>
      <DialogContent sx={{ pt: 3 }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2, mb: 2 }}>
          <Box>
            <Typography variant="caption" color="text.secondary">
              Remitente
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
              <Person fontSize="small" color="action" />
              <Typography variant="body2">{tramite.nombre_destinatario}</Typography>
            </Box>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">
              Área actual
            </Typography>
            <Typography variant="body2" sx={{ mt: 0.5 }}>
              {tramite.area_destinatario}
            </Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">
              Estado
            </Typography>
            <Box sx={{ mt: 0.5 }}>
              <Chip
                label={getEstadoLabel(tramite.estado)}
                size="small"
                color={getEstadoColor(tramite.estado)}
              />
            </Box>
          </Box>
          {tramite.proceso && (
            <Box>
              <Typography variant="caption" color="text.secondary">
                Proceso
              </Typography>
              <Typography variant="body2" sx={{ mt: 0.5 }}>
                {tramite.proceso}
              </Typography>
            </Box>
          )}
          <Box>
            <Typography variant="caption" color="text.secondary">
              Oficio
            </Typography>
            <Typography variant="body2" sx={{ mt: 0.5 }}>
              {tramite.oficio || '—'}
            </Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">
              Fecha creación
            </Typography>
            <Typography variant="body2" sx={{ mt: 0.5 }}>
              {tramite.fecha_creacion
                ? new Date(tramite.fecha_creacion).toLocaleString('es-DO')
                : 'N/A'}
            </Typography>
          </Box>
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid', borderColor: 'divider' }}>
        <Button onClick={onClose} variant="outlined" sx={{ minWidth: 100 }}>
          Cerrar
        </Button>
        <Button onClick={onVerHistorial} variant="contained">
          Ver historial de movimientos
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DetalleTramiteDialog;

