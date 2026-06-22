import { motion } from 'framer-motion';

export function TabSkeleton() {
  return (
    <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%' }}>
      {/* Title skeleton */}
      <motion.div 
        initial={{ opacity: 0.3 }}
        animate={{ opacity: 0.7 }}
        transition={{ duration: 1.2, repeat: Infinity, repeatType: 'reverse' }}
        style={{ width: '30%', height: '32px', borderRadius: '8px', background: 'var(--sf-border)' }}
      />
      <motion.div 
        initial={{ opacity: 0.3 }}
        animate={{ opacity: 0.7 }}
        transition={{ duration: 1.2, repeat: Infinity, repeatType: 'reverse', delay: 0.1 }}
        style={{ width: '50%', height: '16px', borderRadius: '6px', background: 'var(--sf-border)', marginTop: '-0.5rem' }}
      />

      {/* Content skeleton blocks */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginTop: '1rem' }}>
        {[1, 2, 3].map((i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0.3 }}
            animate={{ opacity: 0.7 }}
            transition={{ duration: 1.2, repeat: Infinity, repeatType: 'reverse', delay: i * 0.15 }}
            style={{ 
              height: '250px', 
              borderRadius: '16px', 
              background: 'var(--sf-bg-card)', 
              border: '1px solid var(--sf-border)',
              display: 'flex',
              flexDirection: 'column',
              padding: '1.5rem',
              gap: '1rem'
            }}
          >
            <div style={{ width: '40%', height: '24px', borderRadius: '6px', background: 'var(--sf-border)' }} />
            <div style={{ width: '100%', height: '12px', borderRadius: '4px', background: 'var(--sf-border)', marginTop: 'auto' }} />
            <div style={{ width: '80%', height: '12px', borderRadius: '4px', background: 'var(--sf-border)' }} />
            <div style={{ width: '90%', height: '12px', borderRadius: '4px', background: 'var(--sf-border)' }} />
          </motion.div>
        ))}
      </div>
    </div>
  );
}
