export interface HltbData {
  mainStory: number;
  mainExtra: number;
  completionist: number;
}

export interface GameEntry {
  id: string;
  channel: string;
  name: string;
  coverUrl?: string;
  hoursPlayed: number;
  score: number;
  completedDate?: string;
  playDates?: string[];
  notes?: string;
  hltbData?: HltbData;
  createdAt: string;
  updatedAt: string;
}
