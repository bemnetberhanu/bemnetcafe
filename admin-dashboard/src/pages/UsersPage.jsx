import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import api from '../api/client';
import Modal from '../components/Modal';
import FormField, { inputStyle } from '../components/FormField';

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'manager' });
  const [saving, setSaving] = useState(false);

  const fetchUsers = useCallback(async () => {
    try {
      const res = await api.get('/users');
      setUsers(res.data);
    } catch (err) {
      toast.error('Failed to load users.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  function openCreate() {
    setEditing(null);
    setForm({ name: '', email: '', password: '', role: 'manager' });
    setShowModal(true);
  }

  function openEdit(user) {
    setEditing(user);
    setForm({ name: user.name, email: user.email, password: '', role: user.role, is_active: user.is_active });
    setShowModal(true);
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) {
        await api.put(`/users/${editing.id}`, { name: form.name, email: form.email, role: form.role, is_active: form.is_active });
        if (form.password) {
          await api.patch(`/users/${editing.id}/reset-password`, { new_password: form.password });
        }
        toast.success('User updated.');
      } else {
        await api.post('/users', form);
        toast.success('User created.');
      }
      setShowModal(false);
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDeactivate(user) {
    if (!confirm(`Deactivate ${user.name}? They will no longer be able to log in.`)) return;
    try {
      await api.delete(`/users/${user.id}`);
      toast.success('User deactivated.');
      fetchUsers();
    } catch (err) {
      toast.error('Failed to deactivate.');
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700 }}>Users</h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: 14 }}>Manage admin and manager accounts</p>
        </div>
        <button onClick={openCreate} style={{ padding: '10px 18px', background: 'var(--color-primary)', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>
          + Add User
        </button>
      </div>

      {loading ? (
        <div style={{ padding: 40, color: 'var(--color-text-muted)' }}>Loading...</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
          {users.map(user => (
            <div key={user.id} style={{
              background: 'var(--color-surface)', border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)', padding: '18px 20px',
              opacity: user.is_active ? 1 : 0.6,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 12 }}>
                <div style={{
                  width: 44, height: 44, borderRadius: '50%', fontSize: 18,
                  background: user.role === 'admin' ? 'var(--color-primary-light)' : '#dbeafe',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {user.role === 'admin' ? '👑' : '👤'}
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 15 }}>{user.name}</div>
                  <div style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>{user.email}</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                <span style={{
                  padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                  background: user.role === 'admin' ? 'var(--color-primary-light)' : '#dbeafe',
                  color: user.role === 'admin' ? 'var(--color-primary-dark)' : 'var(--color-info)',
                }}>
                  {user.role}
                </span>
                <span style={{
                  padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                  background: user.is_active ? '#dcfce7' : '#f3f4f6',
                  color: user.is_active ? 'var(--color-success)' : 'var(--color-text-muted)',
                }}>
                  {user.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => openEdit(user)} style={{ flex: 1, padding: '7px', background: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: 7, fontSize: 13, cursor: 'pointer' }}>Edit</button>
                {user.is_active && (
                  <button onClick={() => handleDeactivate(user)} style={{ flex: 1, padding: '7px', background: '#fee2e2', border: '1px solid #fecaca', color: 'var(--color-danger)', borderRadius: 7, fontSize: 13, cursor: 'pointer' }}>Deactivate</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <Modal title={editing ? 'Edit User' : 'Create User'} onClose={() => setShowModal(false)}>
          <form onSubmit={handleSave}>
            <FormField label="Name" required>
              <input required style={inputStyle} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            </FormField>
            <FormField label="Email" required>
              <input required type="email" style={inputStyle} value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
            </FormField>
            <FormField label={editing ? 'New Password (leave blank to keep)' : 'Password'}>
              <input type="password" required={!editing} minLength={6} style={inputStyle} value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder={editing ? 'Leave blank to keep current' : 'Min 6 characters'} />
            </FormField>
            <FormField label="Role" required>
              <select required style={inputStyle} value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
                <option value="admin">Admin</option>
                <option value="manager">Manager</option>
              </select>
            </FormField>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
              <button type="button" onClick={() => setShowModal(false)} style={{ padding: '9px 18px', background: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: 7, fontSize: 14, cursor: 'pointer' }}>Cancel</button>
              <button type="submit" disabled={saving} style={{ padding: '9px 18px', background: 'var(--color-primary)', color: '#fff', border: 'none', borderRadius: 7, fontSize: 14, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer' }}>
                {saving ? 'Saving...' : (editing ? 'Update' : 'Create')}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
