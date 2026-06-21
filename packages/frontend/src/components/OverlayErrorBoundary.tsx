import { Component, type ReactNode } from 'react';
import { TranslationContext } from '../i18n/context';
import styles from './OverlayErrorBoundary.module.css';

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
        <div className={styles.errorContainer}>
          <div className={styles.errorIcon}>⚠</div>
          <div className={styles.errorTitle}>{this.context.t('overlay.errorOverlay')}</div>
          <div className={styles.errorDetail}>
            {this.state.error.message}
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
