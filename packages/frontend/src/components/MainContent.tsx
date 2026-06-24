import { lazy, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
const AchievementsPanel = lazy(() => import('./AchievementsPanel').then(m => ({ default: m.AchievementsPanel })));
const KpiPanel = lazy(() => import('./KpiPanel').then(m => ({ default: m.KpiPanel })));

interface Props {
  activeTab: Tab;
  tabDirection: number;
  channel: string;
  alwaysOnTop: boolean;
  toggleAlwaysOnTop: () => void;
}

export function MainContent({ activeTab, tabDirection, channel, alwaysOnTop, toggleAlwaysOnTop }: Props) {
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
      case 'bitrate':   return <BitrateCalculatorPanel />;
      case 'vertical':  return <VerticalStreamingPanel />;
      case 'alertsounds': return <AlertSoundsPanel channel={channel} />;
      case 'achievements': return <AchievementsPanel channel={channel} />;
      case 'kpi':       return <KpiPanel channel={channel} />;
      case 'config':    return <ConfigPanel channel={channel} alwaysOnTop={alwaysOnTop} toggleAlwaysOnTop={toggleAlwaysOnTop} />;
      default:          return null;
    }
  })();

  return (
    <AnimatePresence mode="wait" custom={tabDirection}>
      <motion.div
        key={activeTab}
        className={styles.content}
        custom={tabDirection}
        variants={{
          enter: (dir: number) => ({ opacity: 0, x: dir * 20, y: 0 }),
          center: { opacity: 1, x: 0, y: 0 },
          exit: { opacity: 0, y: -6, x: 0 },
        }}
        initial="enter"
        animate="center"
        exit="exit"
        transition={{ duration: 0.25, ease: 'easeOut' }}
      >
        <Suspense fallback={<TabSkeleton />}>
          {panel}
        </Suspense>
      </motion.div>
    </AnimatePresence>
  );
}
