import { useState } from 'react';
import { loginUsuario } from '../services/login.service';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const [usuario, setUsuario] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await loginUsuario(usuario, password);
      login(user);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Usuario o contraseña incorrectos';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#f4f6f8',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <div style={{
        width: 420,
        background: '#fff',
        borderRadius: 16,
        padding: '32px 36px',
        boxShadow: '0 10px 30px rgba(0,0,0,.15)'
      }}>
        <h1 style={{
          textAlign: 'center',
          color: '#4aa3ff',
          marginBottom: 8
        }}>
          Seguimiento de Procesos Internos
        </h1>

        <p style={{
          textAlign: 'center',
          color: '#6b7280',
          marginBottom: 32
        }}>
          Inicia sesión con tu usuario
        </p>

        {error && (
          <p style={{ color: 'red', marginBottom: 12 }}>
            {error}
          </p>
        )}

        <form onSubmit={handleSubmit}>
          <label style={{ fontWeight: 500 }}>Nombre de usuario</label>
          <input
            placeholder="Ej: jperez"
            value={usuario}
            onChange={e => setUsuario(e.target.value)}
            style={{
              width: '100%',
              padding: 12,
              marginTop: 6,
              marginBottom: 20,
              borderRadius: 8,
              border: '1px solid #d1d5db'
            }}
          />

          <label style={{ fontWeight: 500 }}>Contraseña</label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            style={{
              width: '100%',
              padding: 12,
              marginTop: 6,
              marginBottom: 28,
              borderRadius: 8,
              border: '1px solid #d1d5db'
            }}
          />

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: 14,
              background: loading ? '#93c5fd' : '#4aa3ff',
              color: '#fff',
              border: 'none',
              borderRadius: 10,
              fontSize: 16,
              fontWeight: 600,
              cursor: loading ? 'wait' : 'pointer'
            }}
          >
            {loading ? 'Verificando…' : 'Iniciar sesión'}
          </button>
        </form>
      </div>
    </div>
  );
}
