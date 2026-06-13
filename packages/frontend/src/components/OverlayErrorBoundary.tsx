import { Component, type ReactNode } from 'react';
import { TranslationContext } from '../i18n/context';

interface Props { children: ReactNode; }
interface State { error: Error | null; }

export class OverlayErrorBoundary extends Component<Props, State> {
  static contextType = TranslationContext;
  declare context: { t: (key: string, params?: Record<string, string | number>) => string };
  state: State = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: { componentStack?: string }) {
    console.error('[OverlayErrorBoundary]', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{
          padding: 24, background: '#0a0a1a', color: '#ef4444',
          fontFamily: 'monospace', fontSize: 14, height: '100vh',
          display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>⚠</div>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>{this.context.t('overlay.errorOverlay')}</div>
          <div style={{ color: '#94a3b8', maxWidth: 400, wordBreak: 'break-word' }}>
            {this.state.error.message}
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
