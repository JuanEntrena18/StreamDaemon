export interface CalendarEvent {
  id: string;
  channel: string;
  title: string;
  date: string;
  startTime: string;
  duration: number;
  game?: string;
  category?: string;
  description?: string;
  color?: string;
  createdAt: string;
  updatedAt: string;
}
