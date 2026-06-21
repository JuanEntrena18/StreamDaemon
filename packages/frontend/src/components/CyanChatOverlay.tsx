import { useEffect, useState } from 'react';
import styles from './CyanChatOverlay.module.css';

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
      <div className={styles.loading}>
        No hay URL de Cyan Chat configurada.<br />
        Configurala desde el panel principal.
      </div>
    );
  }

  return (
    <iframe
      src={url}
      className={styles.iframe}
      title="Cyan Chat"
    />
  );
}
