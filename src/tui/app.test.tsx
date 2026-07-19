import { describe, it, expect } from 'vitest';
import { renderToString } from 'ink';
import React from 'react';
import App from './app.tsx';

describe('TUI', () => {
  it('renders without crashing', () => {
    const output = renderToString(React.createElement(App));
    expect(output).toBeDefined();
    expect(typeof output).toBe('string');
    expect(output.length).toBeGreaterThan(0);
  });
});