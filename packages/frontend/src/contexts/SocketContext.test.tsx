import React from 'react';
import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { SocketProvider, useSocket } from '../contexts/SocketContext';

function wrapper({ children }: { children: React.ReactNode }) {
  return <SocketProvider>{children}</SocketProvider>;
}

describe('SocketContext', () => {
  it('provides a socket instance', () => {
    const { result } = renderHook(() => useSocket(), { wrapper });
    expect(result.current.socket).toBeDefined();
    expect(typeof result.current.reconnect).toBe('function');
  });
});
