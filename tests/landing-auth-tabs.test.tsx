import test, { afterEach, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';

import { LanguageProvider } from '../src/contexts/LanguageContext';
import { LandingPage } from '../src/pages/LandingPage';

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

  return dom;
}

async function renderLandingPage() {
  const rootElement = document.getElementById('root');
  if (!rootElement) throw new Error('Missing root element');

  const root = createRoot(rootElement);
  await act(async () => {
    root.render(
      <LanguageProvider>
        <LandingPage onLogin={() => {}} />
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

beforeEach(() => {
  installDom();
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  globalThis.fetch = async () => new Response('{}', {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
});

afterEach(async () => {
  await cleanup?.();
  cleanup = null;
});

test('landing auth tabs keep only the latest requested form visible after rapid switching', async () => {
  await renderLandingPage();

  const tabs = Array.from(document.querySelectorAll('[role="tab"]'));
  assert.equal(tabs.length, 2);

  await act(async () => {
    click(tabs[1]);
    click(tabs[0]);
  });

  const loginEmail = document.querySelector('input[name="loginEmail"]');
  const registerName = document.querySelector('input[name="fullName"]');

  assert.ok(loginEmail, 'expected login form to be visible');
  assert.equal(registerName, null);
});
