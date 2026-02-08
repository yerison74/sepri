import { useEffect, useState } from 'react';
import {
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Button, Stack, Chip
} from '@mui/material';
import { obtenerUsuariosActivos, eliminarUsuario } from '../services/usuarios.service';
import { useAuth } from '../context/AuthContext';

export default function GestionUsuarios() {
  const { user } = useAuth();
  const [users, setUsers] = useState<any[]>([]);

  const cargarUsuarios = async () => {
    const data = await obtenerUsuariosActivos();
    setUsers(data);
  };

  useEffect(() => {
    cargarUsuarios();
  }, []);

  const handleEliminarUsuario = async (u: any) => {
    if (u.id === user.id) {
      alert('No puedes eliminar tu propio usuario');
      return;
    }

    if (!window.confirm(`¿Eliminar al usuario ${u.usuario}?`)) return;

    await eliminarUsuario(u.id);
    cargarUsuarios();
  };

  const handleEditarUsuario = (u: any) => {
    console.log('Editar usuario:', u);
  };

  return (
    <TableContainer component={Paper} sx={{ mt: 3 }}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell><strong>Usuario</strong></TableCell>
            <TableCell><strong>Nombre</strong></TableCell>
            <TableCell><strong>Apellido</strong></TableCell>
            <TableCell><strong>Rol</strong></TableCell>
            <TableCell><strong>Estado</strong></TableCell>
            <TableCell><strong>Acciones</strong></TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {users.map(u => (
            <TableRow key={u.id} hover>
              <TableCell>{u.usuario}</TableCell>
              <TableCell>{u.nombre}</TableCell>
              <TableCell>{u.apellido}</TableCell>
              <TableCell>
                <Chip label={u.rol} color="primary" size="small" />
              </TableCell>
              <TableCell>
                <Chip
                  label={u.activo ? 'Activo' : 'Inactivo'}
                  color={u.activo ? 'success' : 'default'}
                  size="small"
                />
              </TableCell>
              <TableCell>
                <Stack direction="row" spacing={1}>
                  <Button size="small" onClick={() => handleEditarUsuario(u)}>
                    Editar
                  </Button>
                  <Button size="small" color="error" onClick={() => handleEliminarUsuario(u)}>
                    Eliminar
                  </Button>
                </Stack>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}