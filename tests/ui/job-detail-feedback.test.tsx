import test from 'node:test';
import assert from 'node:assert/strict';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { JSDOM } from 'jsdom';
import { AuthProvider } from '../../src/contexts/AuthContext.tsx';
import { LanguageProvider } from '../../src/contexts/LanguageContext.tsx';
import { JobDetail } from '../../src/pages/JobDetail.tsx';
import { JobStatus, MaterialSource, MaterialType, type PrintJob } from '../../src/types.ts';

type GlobalBrowserSnapshot = {
  window: typeof globalThis.window;
  document: typeof globalThis.document;
  navigator: typeof globalThis.navigator;
  localStorage: typeof globalThis.localStorage;
  sessionStorage: typeof globalThis.sessionStorage;
  HTMLElement: typeof globalThis.HTMLElement;
  Node: typeof globalThis.Node;
  Event: typeof globalThis.Event;
  MouseEvent: typeof globalThis.MouseEvent;
  MutationObserver: typeof globalThis.MutationObserver;
  getComputedStyle: typeof globalThis.getComputedStyle;
  requestAnimationFrame: typeof globalThis.requestAnimationFrame;
  cancelAnimationFrame: typeof globalThis.cancelAnimationFrame;
  reactActFlag: unknown;
};

const sampleJob: PrintJob = {
  id: 'JOB-TEST-001',
  userId: 'user-1',
  userName: 'Student Tester',
  jobName: 'Bracket Prototype',
  description: 'Test detail dialog flow',
  fileName: 'bracket.stl',
  estimatedTime: '2h 15m',
  estimatedGrams: 42,
  materialType: MaterialType.PLA,
  color: 'White',
  materialSource: MaterialSource.LAB,
  status: JobStatus.SUBMITTED,
  cost: 24000,
  createdAt: '2026-03-20T09:00:00.000Z',
};

const captureGlobalBrowserSnapshot = (): GlobalBrowserSnapshot => ({
  window: globalThis.window,
  document: globalThis.document,
  navigator: globalThis.navigator,
  localStorage: globalThis.localStorage,
  sessionStorage: globalThis.sessionStorage,
  HTMLElement: globalThis.HTMLElement,
  Node: globalThis.Node,
  Event: globalThis.Event,
  MouseEvent: globalThis.MouseEvent,
  MutationObserver: globalThis.MutationObserver,
  getComputedStyle: globalThis.getComputedStyle,
  requestAnimationFrame: globalThis.requestAnimationFrame,
  cancelAnimationFrame: globalThis.cancelAnimationFrame,
  reactActFlag: Reflect.get(globalThis, 'IS_REACT_ACT_ENVIRONMENT'),
});

const baselineGlobals = captureGlobalBrowserSnapshot();

test('opens an in-app confirmation dialog for job cancellation without using window.confirm', async () => {
  const globalSnapshot = captureGlobalBrowserSnapshot();

  const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', {
    url: 'http://localhost/',
  });

  const { window } = dom;
  let confirmCalls = 0;
  try {
    Object.assign(globalThis, {
      window,
      document: window.document,
      HTMLElement: window.HTMLElement,
      Node: window.Node,
      Event: window.Event,
      MouseEvent: window.MouseEvent,
      MutationObserver: window.MutationObserver,
      getComputedStyle: window.getComputedStyle.bind(window),
      localStorage: window.localStorage,
      sessionStorage: window.sessionStorage,
      requestAnimationFrame: (callback: FrameRequestCallback) => window.setTimeout(() => callback(Date.now()), 0),
      cancelAnimationFrame: (handle: number) => window.clearTimeout(handle),
      IS_REACT_ACT_ENVIRONMENT: true,
    });
    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      value: window.navigator,
    });

    window.localStorage.setItem('lab_lang', 'EN');
    window.confirm = () => {
      confirmCalls += 1;
      return true;
    };

    const container = window.document.getElementById('root');
    assert.ok(container);

    const root = createRoot(container);

    await act(async () => {
      root.render(
        <AuthProvider>
          <LanguageProvider>
            <JobDetail job={sampleJob} onBack={() => {}} />
          </LanguageProvider>
        </AuthProvider>
      );
    });

    assert.equal(window.document.querySelector('[role="dialog"]'), null);

    const cancelButton = Array.from(window.document.querySelectorAll<HTMLButtonElement>('button')).find((button) => (
      button.textContent?.toLowerCase().includes('cancel')
    ));

    assert.ok(cancelButton);

    await act(async () => {
      cancelButton.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    });

    assert.equal(confirmCalls, 0);
    assert.ok(window.document.querySelector('[role="dialog"]'));

    await act(async () => {
      root.unmount();
    });
  } finally {
    dom.window.close();

    const restore = <K extends keyof GlobalBrowserSnapshot>(key: K, value: GlobalBrowserSnapshot[K]) => {
      if (typeof value === 'undefined') {
        delete (globalThis as Record<string, unknown>)[key as string];
        return;
      }

      Object.defineProperty(globalThis, key, {
        configurable: true,
        writable: true,
        value,
      });
    };

    restore('window', globalSnapshot.window);
    restore('document', globalSnapshot.document);
    restore('navigator', globalSnapshot.navigator);
    restore('localStorage', globalSnapshot.localStorage);
    restore('sessionStorage', globalSnapshot.sessionStorage);
    restore('HTMLElement', globalSnapshot.HTMLElement);
    restore('Node', globalSnapshot.Node);
    restore('Event', globalSnapshot.Event);
    restore('MouseEvent', globalSnapshot.MouseEvent);
    restore('MutationObserver', globalSnapshot.MutationObserver);
    restore('getComputedStyle', globalSnapshot.getComputedStyle);
    restore('requestAnimationFrame', globalSnapshot.requestAnimationFrame);
    restore('cancelAnimationFrame', globalSnapshot.cancelAnimationFrame);
    if (typeof globalSnapshot.reactActFlag === 'undefined') {
      delete (globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT;
    } else {
      Reflect.set(globalThis, 'IS_REACT_ACT_ENVIRONMENT', globalSnapshot.reactActFlag);
    }
  }
});

test('restores global browser shims after the dialog interaction test', () => {
  const currentGlobals = captureGlobalBrowserSnapshot();

  assert.equal(currentGlobals.window, baselineGlobals.window);
  assert.equal(currentGlobals.document, baselineGlobals.document);
  assert.equal(currentGlobals.navigator, baselineGlobals.navigator);
  assert.equal(currentGlobals.localStorage, baselineGlobals.localStorage);
  assert.equal(currentGlobals.sessionStorage, baselineGlobals.sessionStorage);
  assert.equal(currentGlobals.reactActFlag, baselineGlobals.reactActFlag);
});
