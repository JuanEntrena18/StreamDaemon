import React from 'react';
import styles from './Toggle.module.css';

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  size?: 'sm' | 'md';
  label?: React.ReactNode;
  className?: string;
}

export function Toggle({ checked, onChange, size = 'md', label, className = '' }: ToggleProps) {
  const handleToggle = () => {
    onChange(!checked);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleToggle();
    }
  };

  return (
    <div 
      className={`${styles.container} ${className}`} 
      onClick={handleToggle}
      role="switch"
      aria-checked={checked}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      aria-label={typeof label === 'string' ? label : undefined}
    >
      <div 
        className={`${styles.toggleTrack} ${styles[`toggleTrack--${size}`]} ${
          checked ? styles['toggleTrack--on'] : styles['toggleTrack--off']
        }`}
      >
        <span 
          className={`${styles.toggleThumb} ${styles[`toggleThumb--${size}`]} ${
            checked ? styles['toggleThumb--on'] : ''
          }`} 
        />
      </div>
      {label && <span className={styles.label}>{label}</span>}
    </div>
  );
}
