import { motion } from 'framer-motion';
import { formatNumber, formatDuration, formatShortDate, type StreamDetail } from '../utils/trackerUtils';
import { useTranslation } from '../i18n/context';

interface Props {
  data: StreamDetail[];
  dataKey: 'totalViews' | 'followersGained' | 'durationInSeconds';
  color: string;
}

export function TrackerChart({ data, dataKey, color }: Props) {
  const { dateLocale } = useTranslation();
  if (data.length === 0) return null;
  const values = data.map((d) => d[dataKey] as number);
  const max = Math.max(...values, 1);
  const barCount = data.length;
  const barWidth = Math.max(12, Math.min(64, Math.max(400, window.innerWidth - 100) / barCount - 10));
  const gap = Math.max(6, Math.min(14, barWidth * 0.3));
  const padL = 4;
  const padR = 60;
  const labelPad = 34;
  const chartW = barCount * (barWidth + gap) + padL + padR;
  const chartH = 200;
  const plotH = chartH - labelPad;

  const formatVal = (v: number) => {
    if (dataKey === 'durationInSeconds') return formatDuration(v);
    return formatNumber(v);
  };

  return (
    <svg width={chartW} height={chartH} style={{ display: 'block', maxWidth: '100%', height: 'auto', minWidth: 300 }}>
      {data.map((d, i) => {
        const x = i * (barWidth + gap) + padL;
        const barHeight = ((d[dataKey] as number) / max) * plotH;
        const label = formatVal(d[dataKey] as number);
        return (
          <g key={d.videoId}>
            <motion.rect
              initial={{ height: 0, y: chartH }}
              animate={{ height: barHeight, y: chartH - barHeight - 8 }}
              transition={{ duration: 0.4, delay: i * 0.03, ease: 'easeOut' }}
              x={x}
              width={barWidth}
              rx={3}
              fill={color}
              opacity={0.85}
            />
            <motion.text
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3, delay: i * 0.03 + 0.2 }}
              x={x + barWidth / 2}
              y={chartH - barHeight - 14}
              textAnchor="middle"
              fill="#cbd5e1"
              fontSize="11"
              fontWeight={700}
              style={{ fontFamily: 'system-ui, sans-serif' }}
            >
              {label}
            </motion.text>
            <text
              x={x + barWidth / 2}
              y={chartH - 2}
              textAnchor="middle"
              fill="#64748b"
              fontSize="9"
              style={{ fontFamily: 'system-ui, sans-serif' }}
            >
              {formatShortDate(d.creationDate, dateLocale)}
            </text>
            <title>{`${formatShortDate(d.creationDate, dateLocale)}: ${label}`}</title>
          </g>
        );
      })}
      <text
        x={chartW - 6}
        y={14}
        textAnchor="end"
        fill="#64748b"
        fontSize="10"
        style={{ fontFamily: 'system-ui, sans-serif' }}
      >
        máx: {formatVal(max)}
      </text>
      <line x1={0} y1={chartH - 8} x2={chartW} y2={chartH - 8} stroke="#334155" strokeWidth={1} />
    </svg>
  );
}
