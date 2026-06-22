import React from 'react';
import styles from './Skeletons.module.css';

export function SkeletonCard({ className = '', style = {} }: { className?: string; style?: React.CSSProperties }) {
  return <div className={`glass-card ${styles.skeletonCard} ${className}`} style={style} />;
}

export function SkeletonText({ width = '100%', height = '1rem', className = '', style = {} }: { width?: string | number; height?: string | number; className?: string; style?: React.CSSProperties }) {
  return (
    <div
      className={`${styles.skeletonText} ${className}`}
      style={{ width, height, ...style }}
    />
  );
}

export function SkeletonChart({ height = 200, className = '' }: { height?: number; className?: string }) {
  return (
    <div className={`glass-card ${styles.skeletonChartContainer} ${className}`} style={{ height }}>
      <div className={styles.skeletonChartBars}>
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className={styles.skeletonChartBar}
            style={{ height: `${Math.random() * 60 + 20}%` }}
          />
        ))}
      </div>
      <div className={styles.skeletonChartAxis} />
    </div>
  );
}
