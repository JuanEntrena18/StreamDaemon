import { useState, useEffect } from 'react';
import { apiPost, apiPut } from '../utils/api';

interface Props {
  channel: string;
  backendUrl: string;
}

interface Command {
  id: string;
  name: string;
  response: string;
  enabled: boolean;
  aliases: string[];
  cooldown: number;
  modOnly: boolean;
  count: number;
}

export function CommandsPanel({ channel, backendUrl }: Props) {
  const [commands, setCommands] = useState<Command[]>([]);
  const [editing, setEditing] = useState<Command | null>(null);
  const [newName, setNewName] = useState('');
  const [newResponse, setNewResponse] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!channel) return;
    fetch(`${backendUrl}/commands/${channel}`)
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setCommands(data); })
      .catch(() => {});
  }, [channel, backendUrl]);

  const addCommand = async () => {
    if (!newName.trim() || !newResponse.trim()) return;
    setSaving(true);
    setError('');
    try {
      const r = await apiPost('/commands/add', { channel, name: newName.trim().toLowerCase(), response: newResponse.trim() });
      if (r.ok) {
        const cmd = await r.json();
        setCommands((prev) => [...prev, cmd]);
        setNewName('');
        setNewResponse('');
      } else {
        const data = await r.json();
        setError(data.error || 'Error al crear comando');
      }
    } catch {
      setError('Error de conexión');
    } finally {
      setSaving(false);
    }
  };

  const toggleCommand = async (cmd: Command) => {
    await apiPut('/commands/toggle', { channel, commandId: cmd.id, enabled: !cmd.enabled });
    setCommands((prev) => prev.map((c) => c.id === cmd.id ? { ...c, enabled: !c.enabled } : c));
  };

  const deleteCommand = async (cmd: Command) => {
    await apiPost('/commands/delete', { channel, commandId: cmd.id });
    setCommands((prev) => prev.filter((c) => c.id !== cmd.id));
  };

  const updateCommand = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      await apiPut('/commands/update', { channel, commandId: editing.id, response: editing.response, aliases: editing.aliases, cooldown: editing.cooldown, modOnly: editing.modOnly });
      setCommands((prev) => prev.map((c) => c.id === editing.id ? editing : c));
      setEditing(null);
    } catch {
      setError('Error al actualizar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ maxWidth: 700 }}>
      <div style={{ marginBottom: '1.75rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.4rem', color: 'var(--sf-text)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          🤖 Comandos
        </h2>
        <p style={{ color: 'var(--sf-text-2)', fontSize: '0.875rem' }}>
          Gestioná los comandos personalizados de tu chat
        </p>
      </div>

      {/* Add new command */}
      <div className="glass-card" style={{ padding: '1.25rem', marginBottom: '1rem' }}>
        <p className="sf-section-title">➕ Nuevo comando</p>
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <input
            type="text" value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="!comando"
            className="sf-input"
            style={{ width: 140, fontSize: '0.82rem' }}
          />
          <input
            type="text" value={newResponse}
            onChange={(e) => setNewResponse(e.target.value)}
            placeholder="Respuesta del comando..."
            className="sf-input"
            style={{ flex: 1, fontSize: '0.82rem' }}
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button onClick={addCommand} disabled={saving || !newName.trim() || !newResponse.trim()}
            className="sf-btn sf-btn-primary" style={{ fontSize: '0.8rem', padding: '0.4rem 0.875rem' }}>
            {saving ? '...' : 'Crear comando'}
          </button>
          {error && <span style={{ fontSize: '0.78rem', color: '#f87171' }}>{error}</span>}
        </div>
      </div>

      {/* Command list */}
      <div className="glass-card" style={{ padding: '1rem' }}>
        {commands.length === 0 ? (
          <p style={{ fontSize: '0.85rem', color: 'var(--sf-text-3)', textAlign: 'center', padding: '2rem 0' }}>
            {channel ? 'No hay comandos configurados. Creá el primero arriba.' : 'Conectá un canal para gestionar comandos.'}
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {commands.map((cmd) => (
              editing?.id === cmd.id ? (
                /* Edit mode */
                <div key={cmd.id} style={{ padding: '0.75rem', background: 'rgba(124,58,237,0.08)', borderRadius: 8, border: '1px solid rgba(124,58,237,0.2)' }}>
                  <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                    <input value={editing.response} onChange={(e) => setEditing({ ...editing, response: e.target.value })} className="sf-input" style={{ flex: 1, fontSize: '0.8rem' }} />
                    <input value={editing.aliases.join(',')} onChange={(e) => setEditing({ ...editing, aliases: e.target.value.split(',').map((a) => a.trim()) })} placeholder="Alias (separados por coma)" className="sf-input" style={{ width: 180, fontSize: '0.8rem' }} />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <label style={{ fontSize: '0.75rem', color: 'var(--sf-text-2)', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <input type="checkbox" checked={editing.modOnly} onChange={(e) => setEditing({ ...editing, modOnly: e.target.checked })} />
                      Solo mods
                    </label>
                    <label style={{ fontSize: '0.75rem', color: 'var(--sf-text-2)', display: 'flex', alignItems: 'center', gap: 4 }}>
                      Cooldown:
                      <input type="number" value={editing.cooldown} onChange={(e) => setEditing({ ...editing, cooldown: parseInt(e.target.value) || 0 })} style={{ width: 50, fontSize: '0.75rem', padding: '0.2rem 0.4rem', background: 'rgba(0,0,0,0.25)', border: '1px solid var(--sf-border)', borderRadius: 4, color: 'var(--sf-text)' }} />
                      s
                    </label>
                    <button onClick={updateCommand} disabled={saving} className="sf-btn sf-btn-primary" style={{ fontSize: '0.72rem', padding: '0.3rem 0.6rem' }}>Guardar</button>
                    <button onClick={() => setEditing(null)} className="sf-btn sf-btn-ghost" style={{ fontSize: '0.72rem', padding: '0.3rem 0.6rem' }}>Cancelar</button>
                  </div>
                </div>
              ) : (
                /* View mode */
                <div key={cmd.id} style={{
                  display: 'flex', alignItems: 'center', gap: '0.5rem',
                  padding: '0.5rem 0.75rem',
                  background: 'rgba(255,255,255,0.03)', borderRadius: 8,
                  opacity: cmd.enabled ? 1 : 0.4,
                }}>
                  <span style={{
                    width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
                    background: cmd.enabled ? '#34d399' : '#6b7280',
                  }} />
                  <strong style={{ fontSize: '0.85rem', color: 'var(--sf-text)', minWidth: 90 }}>!{cmd.name}</strong>
                  <span style={{ fontSize: '0.78rem', color: 'var(--sf-text-2)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {cmd.response}
                  </span>
                  <span style={{ fontSize: '0.68rem', color: 'var(--sf-text-3)', minWidth: 40, textAlign: 'right' }}>
                    {cmd.count > 0 ? `${cmd.count}x` : ''}
                  </span>
                  <button onClick={() => setEditing(cmd)} className="sf-btn sf-btn-ghost" style={{ fontSize: '0.7rem', padding: '0.2rem 0.45rem' }} title="Editar">✏️</button>
                  <button onClick={() => toggleCommand(cmd)} className="sf-btn sf-btn-ghost" style={{ fontSize: '0.7rem', padding: '0.2rem 0.45rem' }} title={cmd.enabled ? 'Deshabilitar' : 'Habilitar'}>
                    {cmd.enabled ? '🔕' : '🔔'}
                  </button>
                  <button onClick={() => deleteCommand(cmd)} className="sf-btn sf-btn-ghost" style={{ fontSize: '0.7rem', padding: '0.2rem 0.45rem', color: '#f87171' }} title="Eliminar">🗑️</button>
                </div>
              )
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
