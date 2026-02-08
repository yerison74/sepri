import { useEffect, useState } from 'react';
import { obtenerUsuarios, crearUsuario, actualizarUsuario } from '../services/usuarios.service';
import { Button } from '@mui/material';
import UsuarioModalViejo from './usuarios/UsuarioModalViejo';

export default function GestionUsuarios() {
  const [users, setUsers] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<any>({
    usuario: '', password: '', nombre: '', apellido: '',
    cargo: '', area: 'Ninguna', rol: 'usuario', permisos: {}, activo: true,
  });

  const cargar = async () => setUsers(await obtenerUsuarios());
  useEffect(()=>{ cargar(); }, []);

  const nuevo = () => {
    setEditId(null);
    setForm({ usuario:'', password:'', nombre:'', apellido:'', cargo:'', area:'Ninguna', rol:'usuario', permisos:{}, activo:true });
    setOpen(true);
  };

  const editar = (u:any) => {
    setEditId(u.id);
    setForm(u);
    setOpen(true);
  };

  const guardar = async () => {
    editId ? await actualizarUsuario(editId, form) : await crearUsuario(form);
    setOpen(false);
    cargar();
  };

  return (
    <div>
      <Button variant="contained" onClick={nuevo}>Nuevo usuario</Button>

      <table>
        <thead>
          <tr>
            <th>Usuario</th><th>Nombre</th><th>Apellido</th><th>Rol</th><th>Estado</th><th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {users.map(u=>(
            <tr key={u.id}>
              <td>{u.usuario}</td>
              <td>{u.nombre}</td>
              <td>{u.apellido}</td>
              <td>{u.rol}</td>
              <td>{u.activo?'Activo':'Inactivo'}</td>
              <td><Button size="small" onClick={()=>editar(u)}>Editar</Button></td>
            </tr>
          ))}
        </tbody>
      </table>

      <UsuarioModalViejo
        open={open}
        onClose={()=>setOpen(false)}
        onSave={guardar}
        form={form}
        setForm={setForm}
        isEdit={!!editId}
      />
    </div>
  );
}