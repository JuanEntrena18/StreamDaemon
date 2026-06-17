import { useEffect, useState } from 'react';

interface Props {
  channel: string;
}

const LS_KEY = 'cyanChatUrl';

export function CyanChatOverlay({ channel }: Props) {
  const [url, setUrl] = useState('');

  useEffect(() => {
    const saved = localStorage.getItem(LS_KEY) || '';
    if (saved) {
      setUrl(saved);
    } else if (channel) {
      const fallback = `https://chat.johnnycyan.com/?channel=${encodeURIComponent(channel)}`;
      setUrl(fallback);
    }
  }, [channel]);

  if (!url) {
    return (
      <div style={{
        width: '100vw', height: '100vh',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem',
        fontFamily: 'sans-serif', textAlign: 'center', padding: 20,
      }}>
        No hay URL de Cyan Chat configurada.<br />
        Configurala desde el panel principal.
      </div>
    );
  }

  return (
    <iframe
      src={url}
      style={{
        width: '100vw',
        height: '100vh',
        border: 'none',
        background: 'transparent',
      }}
      title="Cyan Chat"
    />
  );
}
