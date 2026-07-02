import { BuilderProvider, OverlayBuilder, WidgetPalette, PropertyPanel } from './builder';

export function BuilderPanel() {
  return (
    <BuilderProvider>
      <div style={{ display: 'flex', height: '100%' }}>
        <WidgetPalette />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <OverlayBuilder />
        </div>
        <PropertyPanel />
      </div>
    </BuilderProvider>
  );
}
