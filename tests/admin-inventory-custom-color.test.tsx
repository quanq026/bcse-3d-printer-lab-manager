import test, { afterEach, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';

import { LanguageProvider } from '../src/contexts/LanguageContext';
import { getUiText } from '../src/lib/uiText';
import { AdminInventory } from '../src/pages/AdminInventory';

let cleanup: (() => Promise<void>) | null = null;

function installDom() {
  const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', {
    url: 'http://localhost/',
  });

  globalThis.window = dom.window as typeof globalThis.window;
  globalThis.document = dom.window.document;
  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    value: dom.window.navigator,
  });
  Object.defineProperty(globalThis, 'HTMLElement', {
    configurable: true,
    value: dom.window.HTMLElement,
  });
  Object.defineProperty(globalThis, 'HTMLInputElement', {
    configurable: true,
    value: dom.window.HTMLInputElement,
  });
  Object.defineProperty(globalThis, 'Event', {
    configurable: true,
    value: dom.window.Event,
  });
  Object.defineProperty(globalThis, 'MouseEvent', {
    configurable: true,
    value: dom.window.MouseEvent,
  });
  Object.defineProperty(globalThis, 'getComputedStyle', {
    configurable: true,
    value: dom.window.getComputedStyle.bind(dom.window),
  });
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: dom.window.localStorage,
  });
  Object.defineProperty(globalThis, 'sessionStorage', {
    configurable: true,
    value: dom.window.sessionStorage,
  });
  Object.defineProperty(globalThis, 'requestAnimationFrame', {
    configurable: true,
    value: (cb: FrameRequestCallback) => setTimeout(() => cb(Date.now()), 0),
  });
  Object.defineProperty(globalThis, 'cancelAnimationFrame', {
    configurable: true,
    value: (id: number) => clearTimeout(id),
  });
}

async function renderAdminInventory() {
  const rootElement = document.getElementById('root');
  if (!rootElement) throw new Error('Missing root element');

  const root = createRoot(rootElement);
  await act(async () => {
    root.render(
      <LanguageProvider>
        <AdminInventory />
      </LanguageProvider>,
    );
    await Promise.resolve();
  });

  cleanup = async () => {
    await act(async () => {
      root.unmount();
      await Promise.resolve();
    });
  };
}

function click(element: Element) {
  element.dispatchEvent(new MouseEvent('click', { bubbles: true }));
}

function findButtonByText(text: string) {
  const match = Array.from(document.querySelectorAll('button'))
    .find((element) => element.textContent?.trim() === text);

  if (!match) {
    throw new Error(`Missing button with text: ${text}`);
  }

  return match;
}

beforeEach(() => {
  installDom();
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  globalThis.fetch = async () => new Response('[]', {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
});

afterEach(async () => {
  await cleanup?.();
  cleanup = null;
});

test('admin inventory custom color button enters custom color mode when clicked', async () => {
  const copy = getUiText('VN').adminInventory;

  await renderAdminInventory();

  await act(async () => {
    click(findButtonByText(copy.add));
  });

  const customButton = findButtonByText(copy.customColor);

  await act(async () => {
    click(customButton);
  });

  assert.equal(customButton.getAttribute('aria-pressed'), 'true');

  const input = document.querySelector(`input[placeholder="${copy.customColorPlaceholder}"]`) as HTMLInputElement | null;
  assert.ok(input, 'expected custom color input to remain visible after selecting custom mode');

  await act(async () => {
    input.value = 'Mint';
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });

  assert.equal(input.value, 'Mint');
});
