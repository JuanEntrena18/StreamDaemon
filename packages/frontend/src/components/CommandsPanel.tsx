import { useState, useEffect, useRef, useCallback } from 'react';
import { apiPost, apiPut } from '../utils/api';
import { useSocket } from '../hooks/useSocket';

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

const TWITCH_VARS = [
  { var: '{user}', desc: 'Nombre del usuario que ejecutó el comando' },
  { var: '{channel}', desc: 'Nombre del canal' },
  { var: '{streamer}', desc: 'Nombre del streamer' },
  { var: '{game}', desc: 'Juego actual del stream' },
  { var: '{title}', desc: 'Título actual del stream' },
  { var: '{uptime}', desc: 'Tiempo que lleva en vivo (ej: 2h 15m)' },
  { var: '{viewers}', desc: 'Espectadores actuales' },
  { var: '{followers}', desc: 'Seguidores totales' },
  { var: '{subs}', desc: 'Suscriptores totales' },
  { var: '{count}', desc: 'Veces que se usó el comando' },
  { var: '{random:1-100}', desc: 'Número aleatorio entre 1 y 100' },
  { var: '{args}', desc: 'Texto después del comando (argumentos)' },
];

const EXAMPLE_COMMANDS = [
  { cmd: '!redes', resp: 'Sígueme en {channel}: https://twitch.tv/{channel}', desc: 'Muestra las redes' },
  { cmd: '!edad', resp: 'El canal tiene {uptime} de directo hoy', desc: 'Muestra uptime' },
  { cmd: '!sorteo', resp: '@{user} ganó un pase de batalla! 🎉', desc: 'Anunciar ganador' },
  { cmd: '!dado', resp: '{user} sacó un {random:1-6} 🎲', desc: 'Dado aleatorio' },
  { cmd: '!info', resp: '🎮 {game} · {title} · {viewers} viewers', desc: 'Info del stream' },
];

function VarPicker({ onSelect, onClose }: { onSelect: (v: string) => void; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose(); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);
  return (
    <div ref={ref} style={{
      position: 'absolute', bottom: '100%', left: 0, right: 0, zIndex: 100,
      background: '#1a1a2e', border: '1px solid rgba(124,58,237,0.4)',
      borderRadius: 8, maxHeight: 220, overflowY: 'auto',
      boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
    }}>
      <div style={{ padding: '0.4rem 0.6rem', fontSize: '0.65rem', color: 'var(--sf-text-3)', fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        Variables disponibles
      </div>
      {TWITCH_VARS.map((v) => (
        <div key={v.var} onClick={() => onSelect(v.var)} style={{
          padding: '0.35rem 0.6rem', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          fontSize: '0.78rem', transition: 'background 0.15s',
        }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(124,58,237,0.15)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}>
          <span style={{ color: '#a78bfa', fontWeight: 700, fontFamily: 'monospace' }}>{v.var}</span>
          <span style={{ color: 'var(--sf-text-3)', fontSize: '0.7rem', marginLeft: 8 }}>{v.desc}</span>
        </div>
      ))}
    </div>
  );
}

export function CommandsPanel({ channel, backendUrl }: Props) {
  const [commands, setCommands] = useState<Command[]>([]);
  const [editing, setEditing] = useState<Command | null>(null);
  const [newName, setNewName] = useState('');
  const [newResponse, setNewResponse] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [importResult, setImportResult] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [showVarPicker, setShowVarPicker] = useState<'new' | 'edit' | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const { socket: sock } = useSocket();

  useEffect(() => {
    if (!channel) return;
    sock.emit('join:channel', channel);
  }, [sock, channel]);

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

  const exportCommands = () => {
    if (commands.length === 0) return;
    const data = { channel, commands, exportedAt: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `comandos-${channel}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importCommands = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportResult(null);
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const cmds = data.commands ?? data;
      if (!Array.isArray(cmds)) throw new Error('Formato inválido');
      const r = await fetch(`${backendUrl}/commands/${channel}/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ commands: cmds }),
      });
      if (r.ok) {
        const result = await r.json();
        setImportResult(`✅ ${result.imported} importados, ${result.skipped} omitidos`);
        const r2 = await fetch(`${backendUrl}/commands/${channel}`);
        const updated = await r2.json();
        if (Array.isArray(updated)) setCommands(updated);
      } else {
        const err = await r.json();
        setImportResult(`❌ ${err.error || 'Error al importar'}`);
      }
    } catch (e: any) {
      setImportResult(`❌ ${e.message || 'Error al leer archivo'}`);
    }
    e.target.value = '';
  };

  const handleVarInsert = useCallback((target: 'new' | 'edit', v: string) => {
    if (target === 'new') {
      setNewResponse((prev) => prev + v + ' ');
      setShowVarPicker(null);
      setTimeout(() => inputRef.current?.focus(), 0);
    } else if (target === 'edit' && editing) {
      setEditing({ ...editing, response: editing.response + v + ' ' });
      setShowVarPicker(null);
      setTimeout(() => editInputRef.current?.focus(), 0);
    }
  }, [editing]);

  const handleResponseKeyDown = useCallback((target: 'new' | 'edit', e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === '{') {
      setShowVarPicker(target);
    } else if (e.key === 'Escape') {
      setShowVarPicker(null);
    }
  }, []);

  return (
    <div style={{ maxWidth: 700 }}>
      <div style={{ marginBottom: '1.75rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.4rem', color: 'var(--sf-text)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          🤖 Comandos
          <button onClick={() => setShowHelp(!showHelp)} className="sf-btn sf-btn-ghost" style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem', marginLeft: 'auto' }}>
            {showHelp ? '✕ Cerrar ayuda' : '📖 Ayuda'}
          </button>
        </h2>
        <p style={{ color: 'var(--sf-text-2)', fontSize: '0.875rem' }}>
          Gestioná los comandos personalizados de tu chat
        </p>
      </div>

      {/* Help section */}
      {showHelp && (
        <div className="glass-card" style={{ padding: '1.25rem', marginBottom: '1rem' }}>
          <p className="sf-section-title" style={{ fontSize: '0.82rem', marginBottom: '0.6rem' }}>📘 Ejemplos de comandos</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: '1rem' }}>
            {EXAMPLE_COMMANDS.map((ex) => (
              <div key={ex.cmd} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.78rem', padding: '0.3rem 0.5rem', background: 'rgba(255,255,255,0.03)', borderRadius: 6 }}>
                <span style={{ color: '#a78bfa', fontWeight: 700, fontFamily: 'monospace', minWidth: 60 }}>{ex.cmd}</span>
                <span style={{ color: 'var(--sf-text-2)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ex.resp}</span>
                <span style={{ color: 'var(--sf-text-3)', fontSize: '0.68rem' }}>{ex.desc}</span>
              </div>
            ))}
          </div>
          <p className="sf-section-title" style={{ fontSize: '0.82rem', marginBottom: '0.5rem' }}>🔤 Variables disponibles</p>
          <p style={{ fontSize: '0.72rem', color: 'var(--sf-text-3)', marginBottom: '0.5rem' }}>
            Escribí <code style={{ color: '#a78bfa' }}>{'\{'}</code> en la respuesta para ver el menú de variables. También podés usarlas directamente:
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.25rem 1rem' }}>
            {TWITCH_VARS.map((v) => (
              <div key={v.var} style={{ fontSize: '0.74rem', display: 'flex', gap: '0.4rem' }}>
                <span style={{ color: '#a78bfa', fontFamily: 'monospace', fontWeight: 600, minWidth: 100 }}>{v.var}</span>
                <span style={{ color: 'var(--sf-text-3)' }}>{v.desc}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add new command */}
      <div className="glass-card" style={{ padding: '1.25rem', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
          <p className="sf-section-title" style={{ margin: 0 }}>➕ Nuevo comando</p>
          <div style={{ display: 'flex', gap: '0.375rem' }}>
            <button onClick={exportCommands} disabled={commands.length === 0}
              className="sf-btn" style={{ fontSize: '0.72rem', padding: '0.3rem 0.6rem' }}>
              📤 Exportar
            </button>
            <button onClick={() => fileRef.current?.click()}
              className="sf-btn" style={{ fontSize: '0.72rem', padding: '0.3rem 0.6rem' }}>
              📥 Importar
            </button>
            <input ref={fileRef} type="file" accept=".json" onChange={importCommands} style={{ display: 'none' }} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <input
            type="text" value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="!comando"
            className="sf-input"
            style={{ width: 140, fontSize: '0.82rem' }}
          />
          <div style={{ position: 'relative', flex: 1 }}>
            <input
              ref={inputRef}
              type="text" value={newResponse}
              onChange={(e) => setNewResponse(e.target.value)}
              onKeyDown={(e) => handleResponseKeyDown('new', e)}
              placeholder='Respuesta (ej: Hola {user}! 👋)'
              className="sf-input"
              style={{ width: '100%', fontSize: '0.82rem' }}
            />
            {showVarPicker === 'new' && (
              <VarPicker onSelect={(v) => handleVarInsert('new', v)} onClose={() => setShowVarPicker(null)} />
            )}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button onClick={addCommand} disabled={saving || !newName.trim() || !newResponse.trim()}
            className="sf-btn sf-btn-primary" style={{ fontSize: '0.8rem', padding: '0.4rem 0.875rem' }}>
            {saving ? '...' : 'Crear comando'}
          </button>
          {error && <span style={{ fontSize: '0.78rem', color: '#f87171' }}>{error}</span>}
          {importResult && <span style={{ fontSize: '0.78rem', color: importResult.startsWith('✅') ? '#34d399' : '#f87171' }}>{importResult}</span>}
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
                    <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
                      <input
                        ref={editInputRef}
                        value={editing.response} onChange={(e) => setEditing({ ...editing, response: e.target.value })}
                        onKeyDown={(e) => handleResponseKeyDown('edit', e)}
                        className="sf-input" style={{ width: '100%', fontSize: '0.8rem' }}
                      />
                      {showVarPicker === 'edit' && (
                        <VarPicker onSelect={(v) => handleVarInsert('edit', v)} onClose={() => setShowVarPicker(null)} />
                      )}
                    </div>
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
                  <button onClick={() => { setEditing(cmd); setShowVarPicker(null); }} className="sf-btn sf-btn-ghost" style={{ fontSize: '0.7rem', padding: '0.2rem 0.45rem' }} title="Editar">✏️</button>
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
