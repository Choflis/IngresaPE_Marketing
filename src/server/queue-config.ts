import type { QueueOptions } from 'pg-boss';
// Hard execution limit covers provider polling, download and rendering.
// Heartbeats independently recover crashed workers without expiring healthy long jobs.
export const productionQueueOptions: QueueOptions = {
  retryLimit: 2,
  retryDelay: 10,
  expireInSeconds: 3600,
  heartbeatSeconds: 60,
  deleteAfterSeconds: 86400,
};
