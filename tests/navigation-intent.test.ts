import test from 'node:test';
import assert from 'node:assert/strict';

import { JobStatus, MaterialSource, MaterialType, type PrintJob } from '../src/types';
import {
  createNavigationIntentState,
  failRequestedJob,
  requestPageIntent,
  requestJobIntent,
  resolveRequestedJob,
} from '../src/lib/navigationIntent';

function createJob(id: string): PrintJob {
  return {
    id,
    userId: 'user-1',
    userName: 'Test User',
    jobName: `Job ${id}`,
    fileName: `${id}.stl`,
    estimatedTime: '1h',
    estimatedGrams: 10,
    materialType: MaterialType.PLA,
    color: 'White',
    materialSource: MaterialSource.LAB,
    status: JobStatus.SUBMITTED,
    cost: 10000,
    createdAt: '2026-03-22T00:00:00.000Z',
  };
}

test('page intent switches immediately to the latest requested page', () => {
  const initial = createNavigationIntentState('dashboard');

  const next = requestPageIntent(initial, 'queue');

  assert.equal(next.activePage, 'queue');
  assert.equal(next.pendingJobId, null);
  assert.equal(next.selectedJob, null);
});

test('older job responses are ignored after a newer job intent is requested', () => {
  const initial = createNavigationIntentState('dashboard');
  const firstRequest = requestJobIntent(initial, 'job-a');
  const secondRequest = requestJobIntent(firstRequest, 'job-b');

  const staleResolution = resolveRequestedJob(secondRequest, firstRequest.jobRequestId, createJob('job-a'));

  assert.equal(staleResolution.activePage, 'job-detail');
  assert.equal(staleResolution.pendingJobId, 'job-b');
  assert.equal(staleResolution.selectedJob, null);

  const latestResolution = resolveRequestedJob(staleResolution, secondRequest.jobRequestId, createJob('job-b'));

  assert.equal(latestResolution.pendingJobId, null);
  assert.equal(latestResolution.selectedJob?.id, 'job-b');
});

test('job load errors only affect the latest in-flight request', () => {
  const initial = createNavigationIntentState('dashboard');
  const firstRequest = requestJobIntent(initial, 'job-a');
  const secondRequest = requestJobIntent(firstRequest, 'job-b');

  const staleFailure = failRequestedJob(secondRequest, firstRequest.jobRequestId);

  assert.equal(staleFailure.pendingJobId, 'job-b');
  assert.equal(staleFailure.jobLoadFailed, false);

  const latestFailure = failRequestedJob(staleFailure, secondRequest.jobRequestId);

  assert.equal(latestFailure.pendingJobId, null);
  assert.equal(latestFailure.jobLoadFailed, true);
  assert.equal(latestFailure.activePage, 'job-detail');
});
