import { describe, it, expect } from 'vitest';
import { umami, oddmisc } from '../src/astro/integration';

describe('Astro integration', () => {
  it('umami() returns an AstroIntegration with correct name', () => {
    const integration = umami({ shareUrl: 'https://u.2x.nz/share/test' });
    expect(integration.name).toBe('oddmisc-umami-integration');
    expect(integration.hooks['astro:config:setup']).toBeTypeOf('function');
  });

  it('umami({ shareUrl: false }) does not throw', () => {
    const integration = umami({ shareUrl: false });
    expect(integration.name).toBe('oddmisc-umami-integration');
  });

  it('oddmisc() returns an AstroIntegration with correct name', () => {
    const integration = oddmisc({ umami: { shareUrl: 'https://u.2x.nz/share/test' } });
    expect(integration.name).toBe('oddmisc-integration');
    expect(integration.hooks['astro:config:setup']).toBeTypeOf('function');
  });

  it('oddmisc() with no options does not throw', () => {
    const integration = oddmisc();
    expect(integration.name).toBe('oddmisc-integration');
  });

  it('oddmisc({ umami: { shareUrl: false } }) does not throw', () => {
    const integration = oddmisc({ umami: { shareUrl: false } });
    expect(integration.name).toBe('oddmisc-integration');
  });
});
