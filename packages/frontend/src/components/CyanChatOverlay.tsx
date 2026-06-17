import { useEffect, useState } from 'react';

interface Props {
  channel: string;
}

const LS_KEY = 'cyanChatUrl';

function getCyanChatUrl(channel: string): string {
  const params = new URLSearchParams(window.location.search);
  const fromParam = params.get('cyanUrl');
  if (fromParam) return fromParam;
  const fromLS = localStorage.getItem(LS_KEY);
  if (fromLS) return fromLS;
  return `https://chat.johnnycyan.com/?channel=${encodeURIComponent(channel)}`;
}

export function CyanChatOverlay({ channel }: Props) {
  const [url, setUrl] = useState('');

  useEffect(() => {
    setUrl(getCyanChatUrl(channel));
  }, [channel]);

  if (!url) {
    return (
      <div style={{
        width: '100vw', height: 'calc(100vh - 36px)', marginTop: 36,
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
        height: 'calc(100vh - 36px)',
        marginTop: 36,
        border: 'none',
        background: 'transparent',
      }}
      title="Cyan Chat"
    />
  );
}
