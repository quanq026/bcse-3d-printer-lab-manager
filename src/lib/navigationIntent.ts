import type { PrintJob } from '../types';

export interface NavigationIntentState {
  activePage: string;
  selectedJob: PrintJob | null;
  pendingJobId: string | null;
  jobRequestId: number;
  jobLoadFailed: boolean;
}

export function createNavigationIntentState(initialPage: string): NavigationIntentState {
  return {
    activePage: initialPage,
    selectedJob: null,
    pendingJobId: null,
    jobRequestId: 0,
    jobLoadFailed: false,
  };
}

export function requestPageIntent(state: NavigationIntentState, page: string): NavigationIntentState {
  return {
    ...state,
    activePage: page,
    selectedJob: page === 'job-detail' ? state.selectedJob : null,
    pendingJobId: null,
    jobLoadFailed: false,
  };
}

export function requestJobIntent(state: NavigationIntentState, jobId: string): NavigationIntentState {
  return {
    ...state,
    activePage: 'job-detail',
    selectedJob: null,
    pendingJobId: jobId,
    jobRequestId: state.jobRequestId + 1,
    jobLoadFailed: false,
  };
}

export function resolveRequestedJob(state: NavigationIntentState, requestId: number, job: PrintJob): NavigationIntentState {
  if (requestId !== state.jobRequestId) {
    return state;
  }

  return {
    ...state,
    activePage: 'job-detail',
    selectedJob: job,
    pendingJobId: null,
    jobLoadFailed: false,
  };
}

export function failRequestedJob(state: NavigationIntentState, requestId: number): NavigationIntentState {
  if (requestId !== state.jobRequestId) {
    return state;
  }

  return {
    ...state,
    activePage: 'job-detail',
    selectedJob: null,
    pendingJobId: null,
    jobLoadFailed: true,
  };
}
