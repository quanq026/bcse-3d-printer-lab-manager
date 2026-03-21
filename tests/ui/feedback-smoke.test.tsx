import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { AppToast } from '../../src/components/feedback/AppToast.tsx';
import { ConfirmDialog } from '../../src/components/feedback/ConfirmDialog.tsx';

test('renders toast message content', () => {
  const html = renderToStaticMarkup(
    <AppToast
      toast={{ id: 1, tone: 'success', message: 'Saved successfully' }}
      onClose={() => {}}
    />
  );

  assert.match(html, /Saved successfully/);
  assert.match(html, /status/);
});

test('renders confirm dialog when open', () => {
  const html = renderToStaticMarkup(
    <ConfirmDialog
      open
      title="Delete item"
      body="This action cannot be undone."
      confirmLabel="Delete"
      cancelLabel="Cancel"
      destructive
      onConfirm={() => {}}
      onCancel={() => {}}
    />
  );

  assert.match(html, /Delete item/);
  assert.match(html, /This action cannot be undone/);
  assert.match(html, /dialog/);
});

test('does not render confirm dialog markup when closed', () => {
  const html = renderToStaticMarkup(
    <ConfirmDialog
      open={false}
      title="Delete item"
      body="This action cannot be undone."
      confirmLabel="Delete"
      cancelLabel="Cancel"
      destructive
      onConfirm={() => {}}
      onCancel={() => {}}
    />
  );

  assert.equal(html, '');
});
