import { lazy, Suspense } from 'react';
import type { Tab } from './Sidebar';
import { TabSkeleton } from './TabSkeleton';
import { ChatPanel } from './ChatPanel';
import styles from '../App.module.css';

const GiveawayPanel = lazy(() => import('./GiveawayPanel').then(m => ({ default: m.GiveawayPanel })));
const PredictionPanel = lazy(() => import('./PredictionPanel').then(m => ({ default: m.PredictionPanel })));
const ObsPanel = lazy(() => import('./ObsPanel').then(m => ({ default: m.ObsPanel })));
const ConfigPanel = lazy(() => import('./ConfigPanel').then(m => ({ default: m.ConfigPanel })));
const TrackerPanel = lazy(() => import('./TrackerPanel').then(m => ({ default: m.TrackerPanel })));
const HudPanel = lazy(() => import('./HudPanel').then(m => ({ default: m.HudPanel })));
const TimerPanel = lazy(() => import('./TimerPanel').then(m => ({ default: m.TimerPanel })));
const ScoreboardPanel = lazy(() => import('./ScoreboardPanel').then(m => ({ default: m.ScoreboardPanel })));
const StreamDashboard = lazy(() => import('./StreamDashboard').then(m => ({ default: m.StreamDashboard })));
const ModPanel = lazy(() => import('./ModPanel').then(m => ({ default: m.ModPanel })));
const CommandsPanel = lazy(() => import('./CommandsPanel').then(m => ({ default: m.CommandsPanel })));
const SubathonPanel = lazy(() => import('./SubathonPanel').then(m => ({ default: m.SubathonPanel })));
const SecurityPanel = lazy(() => import('./SecurityPanel').then(m => ({ default: m.SecurityPanel })));
const BitrateCalculatorPanel = lazy(() => import('./BitrateCalculatorPanel').then(m => ({ default: m.BitrateCalculatorPanel })));
const VerticalStreamingPanel = lazy(() => import('./VerticalStreamingPanel').then(m => ({ default: m.VerticalStreamingPanel })));
const AlertSoundsPanel = lazy(() => import('./AlertSoundsPanel').then(m => ({ default: m.AlertSoundsPanel })));
const KpiPanel = lazy(() => import('./KpiPanel').then(m => ({ default: m.KpiPanel })));
const BuilderPanel = lazy(() => import('./BuilderPanel').then(m => ({ default: m.BuilderPanel })));
const AvatarsPanel = lazy(() => import('./AvatarsPanel').then(m => ({ default: m.AvatarsPanel })));
const StreamAvatarPanel = lazy(() => import('./StreamAvatarPanel').then(m => ({ default: m.StreamAvatarPanel })));
const SpeedrunPanel = lazy(() => import('./SpeedrunPanel').then(m => ({ default: m.SpeedrunPanel })));
const CalendarPanel = lazy(() => import('./CalendarPanel').then(m => ({ default: m.CalendarPanel })));
const DiaryPanel = lazy(() => import('./DiaryPanel').then(m => ({ default: m.DiaryPanel })));
const AdsPanel = lazy(() => import('./AdsPanel').then(m => ({ default: m.AdsPanel })));
const VibeDaemonPanel = lazy(() => import('./VibeDaemonPanel').then(m => ({ default: m.VibeDaemonPanel })));

interface Props {
  activeTab: Tab;
  channel: string;
  alwaysOnTop: boolean;
  toggleAlwaysOnTop: () => void;
}

import React from 'react';

class ErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean, error: Error | null}> {
  constructor(props: {children: React.ReactNode}) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '2rem', color: 'var(--sf-danger)', background: 'color-mix(in srgb, var(--sf-danger) 8%, transparent)', border: '1px solid color-mix(in srgb, var(--sf-danger) 25%, transparent)', borderRadius: '8px' }}>
          <h3>Error en la Interfaz (Frontend Crash)</h3>
          <p>{this.state.error?.message}</p>
        </div>
      );
    }
    return this.props.children;
  }
}

export function MainContent({ activeTab, channel, alwaysOnTop, toggleAlwaysOnTop }: Props) {
  const panel = (() => {
    switch (activeTab) {
      case 'dashboard': return <StreamDashboard channel={channel} />;
      case 'tracker':   return <TrackerPanel channel={channel} />;
      case 'security':  return <SecurityPanel channel={channel} />;
      case 'chat':      return <ChatPanel channel={channel} />;
      case 'mod':       return <ModPanel channel={channel} />;
      case 'commands':  return <CommandsPanel channel={channel} />;
      case 'subathon':  return <SubathonPanel channel={channel} />;
      case 'giveaway':  return <GiveawayPanel channel={channel} />;
      case 'prediction': return <PredictionPanel channel={channel} />;
      case 'hud':       return <HudPanel channel={channel} />;
      case 'timer':     return <TimerPanel channel={channel} />;
      case 'scoreboard': return <ScoreboardPanel channel={channel} />;
      case 'obs':       return <ObsPanel channel={channel} />;
      case 'builder':   return <BuilderPanel />;
      case 'bitrate':   return <BitrateCalculatorPanel />;
      case 'vertical':  return <VerticalStreamingPanel />;
      case 'alertsounds': return <AlertSoundsPanel channel={channel} />;
      case 'kpi':       return <KpiPanel channel={channel} />;
      case 'avatars':   return <AvatarsPanel channel={channel} />;
      case 'stream-avatar': return <StreamAvatarPanel channel={channel} />;
      case 'speedrun':  return <SpeedrunPanel channel={channel} />;
      case 'calendar':  return <CalendarPanel channel={channel} />;
      case 'diary':     return <DiaryPanel channel={channel} />;
      case 'ads':       return <AdsPanel channel={channel} />;
      case 'vibedaemon': return <VibeDaemonPanel channel={channel} />;
      case 'config':    return <ConfigPanel channel={channel} alwaysOnTop={alwaysOnTop} toggleAlwaysOnTop={toggleAlwaysOnTop} />;
      default:          return null;
    }
  })();

  return (
    <div key={activeTab} className={styles.content}>
      <ErrorBoundary>
        <Suspense fallback={<TabSkeleton />}>
          {panel}
        </Suspense>
      </ErrorBoundary>
    </div>
  );
}
