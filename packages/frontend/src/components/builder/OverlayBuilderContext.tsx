import React, { createContext, useContext, useReducer, useCallback, type ReactNode } from 'react';
import type { Widget, WidgetType, Layout } from '@streamforger/shared';

export interface BuilderState {
  widgets: Widget[];
  selectedWidgetId: string | null;
  canvasZoom: number;
  gridSnap: boolean;
  gridSize: number;
  history: Widget[][];
  historyIndex: number;
  resolution: { width: number; height: number };
  backgroundColor: string;
  layoutName: string;
  currentLayoutId: string | null;
  isDirty: boolean;
}

type Action =
  | { type: 'ADD_WIDGET'; payload: { type: WidgetType } }
  | { type: 'UPDATE_WIDGET'; payload: { id: string; changes: Partial<Widget> } }
  | { type: 'DELETE_WIDGET'; payload: { id: string } }
  | { type: 'SELECT_WIDGET'; payload: { id: string | null } }
  | { type: 'REORDER'; payload: { id: string; zIndex: number } }
  | { type: 'SET_ZOOM'; payload: number }
  | { type: 'TOGGLE_GRID_SNAP' }
  | { type: 'SET_GRID_SIZE'; payload: number }
  | { type: 'UNDO' }
  | { type: 'REDO' }
  | { type: 'LOAD_LAYOUT'; payload: Layout }
  | { type: 'SET_RESOLUTION'; payload: { width: number; height: number } }
  | { type: 'SET_BACKGROUND'; payload: string }
  | { type: 'SET_LAYOUT_NAME'; payload: string }
  | { type: 'MARK_SAVED' };

function generateId(): string {
  return `w_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function createDefaultWidget(type: WidgetType): Widget {
  const base: Widget = {
    id: generateId(),
    type,
    x: 100,
    y: 100,
    width: 300,
    height: 200,
    zIndex: 0,
    opacity: 1,
    locked: false,
    visible: true,
    config: {},
  };
  switch (type) {
    case 'text':
      base.config.textContent = 'Hello Stream!';
      base.config.fontSize = 32;
      base.config.textColor = '#ffffff';
      base.config.fontFamily = 'Inter, Arial, sans-serif';
      base.width = 400; base.height = 80;
      break;
    case 'chat':
      base.config.backgroundColor = 'rgba(0,0,0,.6)';
      base.config.borderRadius = 8;
      base.width = 360; base.height = 400;
      break;
    case 'hud':
      base.config.backgroundColor = 'rgba(0,0,0,.5)';
      base.config.borderRadius = 8;
      base.config.fontSize = 14;
      base.config.textColor = '#ffffff';
      base.width = 400; base.height = 60;
      break;
    case 'timer':
      base.config.fontSize = 48;
      base.config.textColor = '#ffffff';
      base.config.fontFamily = 'monospace';
      base.width = 200; base.height = 80;
      break;
    case 'scoreboard':
      base.config.backgroundColor = 'rgba(0,0,0,.6)';
      base.config.borderRadius = 8;
      base.config.fontSize = 18;
      base.config.textColor = '#ffffff';
      base.width = 300; base.height = 150;
      break;
    case 'alertbox':
      base.config.backgroundColor = 'rgba(0,0,0,.6)';
      base.config.borderRadius = 12;
      base.config.textColor = '#ffffff';
      base.width = 350; base.height = 120;
      break;
    case 'image':
      base.config.imageSrc = '';
      base.width = 200; base.height = 200;
      break;
    case 'shape':
      base.config.shape = 'rect';
      base.config.backgroundColor = 'rgba(255,255,255,.1)';
      base.config.borderWidth = 2;
      base.config.borderColor = 'rgba(255,255,255,.3)';
      base.width = 300; base.height = 200;
      break;
    case 'webcam':
      base.config.borderRadius = 12;
      base.config.borderWidth = 3;
      base.config.borderColor = '#7c3aed';
      base.width = 320; base.height = 240;
      break;
    case 'social':
      base.config.backgroundColor = 'rgba(0,0,0,.4)';
      base.config.borderRadius = 8;
      base.config.textColor = '#ffffff';
      base.config.socialLinks = [];
      base.width = 400; base.height = 50;
      break;
  }
  return base;
}

function findHighestZIndex(widgets: Widget[]): number {
  if (widgets.length === 0) return 0;
  return Math.max(...widgets.map(w => w.zIndex)) + 1;
}

function reducer(state: BuilderState, action: Action): BuilderState {
  const pushHistory = (newWidgets: Widget[]) => {
    const newHistory = state.history.slice(0, state.historyIndex + 1);
    newHistory.push(newWidgets);
    if (newHistory.length > 50) newHistory.shift();
    return { ...state, widgets: newWidgets, history: newHistory, historyIndex: newHistory.length - 1, isDirty: true };
  };

  switch (action.type) {
    case 'ADD_WIDGET': {
      const widget = createDefaultWidget(action.payload.type);
      widget.zIndex = findHighestZIndex(state.widgets);
      return pushHistory([...state.widgets, widget]);
    }
    case 'UPDATE_WIDGET': {
      const widgets = state.widgets.map(w =>
        w.id === action.payload.id ? { ...w, ...action.payload.changes } : w
      );
      return pushHistory(widgets);
    }
    case 'DELETE_WIDGET': {
      const widgets = state.widgets.filter(w => w.id !== action.payload.id);
      return {
        ...pushHistory(widgets),
        selectedWidgetId: state.selectedWidgetId === action.payload.id ? null : state.selectedWidgetId,
      };
    }
    case 'SELECT_WIDGET':
      return { ...state, selectedWidgetId: action.payload.id };
    case 'REORDER': {
      const widgets = state.widgets.map(w =>
        w.id === action.payload.id ? { ...w, zIndex: action.payload.zIndex } : w
      );
      return pushHistory(widgets);
    }
    case 'SET_ZOOM':
      return { ...state, canvasZoom: Math.max(0.25, Math.min(1.5, action.payload)) };
    case 'TOGGLE_GRID_SNAP':
      return { ...state, gridSnap: !state.gridSnap };
    case 'SET_GRID_SIZE':
      return { ...state, gridSize: action.payload };
    case 'UNDO': {
      if (state.historyIndex <= 0) return state;
      const newIndex = state.historyIndex - 1;
      return { ...state, widgets: state.history[newIndex], historyIndex: newIndex, isDirty: true };
    }
    case 'REDO': {
      if (state.historyIndex >= state.history.length - 1) return state;
      const newIndex = state.historyIndex + 1;
      return { ...state, widgets: state.history[newIndex], historyIndex: newIndex, isDirty: true };
    }
    case 'LOAD_LAYOUT': {
      const layout = action.payload;
      return {
        ...state,
        widgets: layout.widgets,
        resolution: layout.resolution,
        backgroundColor: layout.backgroundColor,
        layoutName: layout.name,
        currentLayoutId: layout.id,
        selectedWidgetId: null,
        history: [layout.widgets],
        historyIndex: 0,
        isDirty: false,
      };
    }
    case 'SET_RESOLUTION':
      return { ...state, resolution: action.payload, isDirty: true };
    case 'SET_BACKGROUND':
      return { ...state, backgroundColor: action.payload, isDirty: true };
    case 'SET_LAYOUT_NAME':
      return { ...state, layoutName: action.payload, isDirty: true };
    case 'MARK_SAVED':
      return { ...state, isDirty: false };
    default:
      return state;
  }
}

const initialState: BuilderState = {
  widgets: [],
  selectedWidgetId: null,
  canvasZoom: 0.5,
  gridSnap: true,
  gridSize: 10,
  history: [[]],
  historyIndex: 0,
  resolution: { width: 1920, height: 1080 },
  backgroundColor: '#0f0f23',
  layoutName: 'My Layout',
  currentLayoutId: null,
  isDirty: false,
};

interface BuilderContextValue {
  state: BuilderState;
  dispatch: React.Dispatch<Action>;
  addWidget: (type: WidgetType) => void;
  updateWidget: (id: string, changes: Partial<Widget>) => void;
  deleteWidget: (id: string) => void;
  selectWidget: (id: string | null) => void;
  undo: () => void;
  redo: () => void;
  selectedWidget: Widget | undefined;
}

const BuilderContext = createContext<BuilderContextValue | null>(null);

export function BuilderProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const addWidget = useCallback((type: WidgetType) => dispatch({ type: 'ADD_WIDGET', payload: { type } }), []);
  const updateWidget = useCallback((id: string, changes: Partial<Widget>) => dispatch({ type: 'UPDATE_WIDGET', payload: { id, changes } }), []);
  const deleteWidget = useCallback((id: string) => dispatch({ type: 'DELETE_WIDGET', payload: { id } }), []);
  const selectWidget = useCallback((id: string | null) => dispatch({ type: 'SELECT_WIDGET', payload: { id } }), []);
  const undo = useCallback(() => dispatch({ type: 'UNDO' }), []);
  const redo = useCallback(() => dispatch({ type: 'REDO' }), []);

  const selectedWidget = state.widgets.find(w => w.id === state.selectedWidgetId);

  return (
    <BuilderContext.Provider value={{ state, dispatch, addWidget, updateWidget, deleteWidget, selectWidget, undo, redo, selectedWidget }}>
      {children}
    </BuilderContext.Provider>
  );
}

export function useBuilder(): BuilderContextValue {
  const ctx = useContext(BuilderContext);
  if (!ctx) throw new Error('useBuilder must be used within BuilderProvider');
  return ctx;
}
