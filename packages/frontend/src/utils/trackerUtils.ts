export interface StreamDetail {
  videoId: string;
  title: string;
  creationDate: string;
  durationInSeconds: number;
  totalViews: number;
  url: string;
  thumbnailUrl: string;
  followersGained: number;
  subsGained: number;
  bitsDonated: number;
}

export function formatDate(iso: string, locale: string = 'es-ES'): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString(locale, {
    day: 'numeric', month: 'long', year: 'numeric',
  });
}

export function formatHours(h: number): string {
  if (h === 0) return '0';
  const hrs = Math.floor(h);
  const mins = Math.round((h - hrs) * 60);
  if (hrs > 0 && mins > 0) return `${hrs}h ${mins}m`;
  if (hrs > 0) return `${hrs}h`;
  return `${mins}m`;
}

export function formatDuration(seconds: number): string {
  if (seconds === 0) return '0m';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const parts: string[] = [];
  if (h > 0) parts.push(`${h}h`);
  if (m > 0) parts.push(`${m}m`);
  if (parts.length === 0) parts.push(`${seconds}s`);
  return parts.join(' ');
}

export function formatNumber(n: number): string {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
  return String(n);
}

export function estimateRevenue(subs: number, bits: number, locale: string = 'es-ES'): string {
  const revenue = subs * 2.49 + bits * 0.01;
  if (revenue === 0) return '—';
  return revenue.toLocaleString(locale, { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 });
}

export function formatDateTime(iso: string, locale: string = 'es-ES'): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString(locale, { day: 'numeric', month: 'short' }) +
    ' · ' + d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
}

export function formatShortDate(iso: string, locale: string = 'es-ES'): string {
  return new Date(iso).toLocaleDateString(locale, { day: 'numeric', month: 'short' });
}
