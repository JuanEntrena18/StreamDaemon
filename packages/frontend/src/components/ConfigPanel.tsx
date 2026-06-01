import { useSocket } from '../hooks/useSocket';
import { useAuthStatus } from '../hooks/useAuthStatus';
import { Logo } from './Logo';

interface Props {
  channel: string;
  alwaysOnTop: boolean;
  toggleAlwaysOnTop: () => void;
}

export function ConfigPanel({ channel, alwaysOnTop, toggleAlwaysOnTop }: Props) {
  const { connected } = useSocket();
  const { authenticated, user, loading: authLoading, login, deviceState, cancelDeviceLogin } = useAuthStatus();

  return (
    <div style={{ maxWidth: 600 }}>
      <div style={{ marginBottom: '1.75rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.4rem', color: 'var(--sf-text)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          ⚙️ Configuración
        </h2>
        <p style={{ color: 'var(--sf-text-2)', fontSize: '0.875rem' }}>
          Conexión a Twitch, preferencias de ventana y acerca de
        </p>
      </div>

      {/* ── Twitch Auth ── */}
      <div className="glass-card" style={{ padding: '1.5rem', marginBottom: '1.25rem' }}>
        <p className="sf-section-title">🔐 Conexión Twitch</p>
        <p style={{ fontSize: '0.82rem', color: 'var(--sf-text-2)', marginBottom: '1rem', lineHeight: 1.5 }}>
          Conecta tu canal de Twitch para activar el chat en vivo, sorteos y predicciones.
        </p>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{
            width: 48, height: 48, borderRadius: 12, flexShrink: 0,
            background: authenticated ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.12)',
            border: `1px solid ${authenticated ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.25)'}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem',
          }}>
            {authenticated ? '✅' : '🔌'}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--sf-text)' }}>
              {authenticated && user ? user.displayName : 'No conectado'}
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--sf-text-3)' }}>
              {authenticated
                ? 'Sesión activa · tokens gestionados automáticamente'
                : 'Conecta con Twitch para usar todas las funciones'}
            </div>
          </div>
          {!authLoading && !authenticated && (
            <button
              onClick={login}
              className="sf-btn"
              style={{
                background: 'linear-gradient(135deg, #9147ff 0%, #6441a5 100%)',
                color: '#fff', fontSize: '0.8rem', padding: '0.5rem 1rem',
                gap: '0.4rem', boxShadow: '0 2px 12px rgba(145,71,255,0.35)', whiteSpace: 'nowrap', flexShrink: 0,
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714z"/>
              </svg>
              Conectar
            </button>
          )}
        </div>

        {/* ── Device Code Dialog ── */}
        {deviceState.status !== 'idle' && (
          <div style={{
            marginTop: '1.25rem', padding: '1.25rem',
            background: 'rgba(124,58,237,0.08)',
            border: '1px solid rgba(124,58,237,0.25)',
            borderRadius: 'var(--sf-radius-sm)',
          }}>
            {deviceState.status === 'loading' && (
              <div style={{ fontSize: '0.85rem', color: 'var(--sf-text-2)', textAlign: 'center' }}>
                Conectando con Twitch…
              </div>
            )}

            {deviceState.status === 'polling' && (
              <>
                <p style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--sf-text)', marginBottom: '0.75rem' }}>
                  🔑 Autorizar en Twitch
                </p>
                <ol style={{ fontSize: '0.82rem', color: 'var(--sf-text-2)', lineHeight: 1.8, paddingLeft: '1.25rem', marginBottom: '1rem' }}>
                  <li>Abre <strong style={{ color: '#a78bfa' }}>{deviceState.verificationUri}</strong> en tu navegador</li>
                  <li>Ingresa el código: <strong style={{
                    fontSize: '1.4rem', fontFamily: 'monospace',
                    color: '#c4b5fd', letterSpacing: '0.15em',
                    background: 'rgba(0,0,0,0.25)', padding: '0.15rem 0.6rem',
                    borderRadius: 6, marginLeft: '0.25rem',
                  }}>{deviceState.userCode}</strong></li>
                  <li>Autoriza la aplicación y vuelve aquí</li>
                </ol>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    onClick={() => {
                      if (deviceState.verificationUri) {
                        if (window.streamforger?.isDesktop) {
                          window.open(deviceState.verificationUri, '_blank');
                        } else {
                          window.open(deviceState.verificationUri, '_blank');
                        }
                      }
                    }}
                    className="sf-btn"
                    style={{
                      background: 'linear-gradient(135deg, #9147ff 0%, #6441a5 100%)',
                      color: '#fff', fontSize: '0.78rem', padding: '0.4rem 0.875rem',
                      flex: 1, justifyContent: 'center',
                    }}
                  >
                    Abrir twitch.tv/activate
                  </button>
                  <button
                    onClick={cancelDeviceLogin}
                    className="sf-btn"
                    style={{
                      background: 'rgba(255,255,255,0.06)',
                      color: 'var(--sf-text-2)', fontSize: '0.78rem',
                      padding: '0.4rem 0.875rem',
                    }}
                  >
                    Cancelar
                  </button>
                </div>
              </>
            )}

            {deviceState.error && (
              <p style={{ fontSize: '0.8rem', color: '#f87171', marginTop: '0.5rem' }}>
                {deviceState.error}
              </p>
            )}
          </div>
        )}

        {/* Channel connector */}
        <div style={{ marginTop: '1.25rem', paddingTop: '1.25rem', borderTop: '1px solid var(--sf-border)' }}>
          <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--sf-text-2)', marginBottom: '0.375rem', fontWeight: 500 }}>
            Canal activo
          </label>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <span style={{ fontSize: '1rem', color: 'var(--sf-text-3)' }}>#</span>
            <input
              type="text"
              value={channel}
              placeholder="nombre del canal"
              className="sf-input"
              style={{ flex: 1 }}
              readOnly
            />
            <div
              className={connected ? 'sf-badge sf-badge-success' : 'sf-badge sf-badge-danger'}
              style={{ flexShrink: 0 }}
            >
              <span style={{
                width: 5, height: 5, borderRadius: '50%',
                background: connected ? 'var(--sf-success)' : 'var(--sf-danger)',
                display: 'inline-block',
              }} />
              {connected ? 'Conectado' : 'Desconectado'}
            </div>
          </div>
        </div>
      </div>

      {/* ── Always on top ── */}
      {window.streamforger && (
        <div className="glass-card" style={{ padding: '1.5rem', marginBottom: '1.25rem' }}>
          <p className="sf-section-title">🪟 Ventana</p>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--sf-text)', marginBottom: '0.1rem' }}>
                Siempre encima
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--sf-text-3)' }}>
                Mantiene la ventana sobre otras aplicaciones
              </div>
            </div>
            <button
              onClick={toggleAlwaysOnTop}
              style={{
                width: 44, height: 24, borderRadius: 99,
                background: alwaysOnTop ? 'var(--sf-primary)' : 'var(--sf-border)',
                border: 'none', cursor: 'pointer', position: 'relative',
                transition: 'background 0.2s', flexShrink: 0,
              }}
            >
              <span style={{
                position: 'absolute', top: 3,
                left: alwaysOnTop ? 'calc(100% - 21px)' : 3,
                width: 18, height: 18, borderRadius: '50%',
                background: 'white', transition: 'left 0.2s',
              }} />
            </button>
          </div>
        </div>
      )}

      {/* ── About ── */}
      <div className="glass-card" style={{ padding: '1.5rem' }}>
        <p className="sf-section-title">📋 Acerca de</p>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.25rem' }}>
          <div className="animate-float"><Logo size={48} /></div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--sf-text)' }}>
              StreamForger
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--sf-text-3)', marginTop: '2px' }}>
              v0.2.0 · by Cyber Haute Couture
            </div>
          </div>
        </div>

        <p style={{ fontSize: '0.82rem', color: 'var(--sf-text-2)', lineHeight: 1.7, marginBottom: '1.25rem' }}>
          Aplicación modular open-source para creadores de contenido. Gestiona tu canal de Twitch
          con overlays personalizados, sorteos interactivos, predicciones y chat en tiempo real.
        </p>

        <div style={{
          padding: '0.875rem 1rem',
          background: 'rgba(124,58,237,0.08)',
          border: '1px solid rgba(124,58,237,0.2)',
          borderRadius: 'var(--sf-radius-sm)',
          display: 'flex', alignItems: 'center', gap: '0.75rem',
        }}>
          <span style={{ fontSize: '1.25rem' }}>🐙</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--sf-text)' }}>
              GitHub
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--sf-text-3)' }}>
              Código abierto · Contribuciones bienvenidas
            </div>
          </div>
          <a
            href="https://github.com/JuanEntrena18/StreamForge"
            target="_blank"
            rel="noreferrer"
            style={{
              padding: '0.4rem 0.875rem',
              borderRadius: 'var(--sf-radius-sm)',
              background: 'rgba(124,58,237,0.2)',
              color: '#a78bfa',
              textDecoration: 'none',
              fontSize: '0.8rem',
              fontWeight: 600,
              transition: 'all 0.15s',
              flexShrink: 0,
            }}
          >
            Ir al repo ↗
          </a>
        </div>

        <div style={{ marginTop: '1rem', fontSize: '0.72rem', color: 'var(--sf-text-3)', textAlign: 'center' }}>
          Licencia AGPLv3 · Uso comercial requiere licencia dual
        </div>
      </div>
    </div>
  );
}
