import { useEffect, useMemo, useState } from 'react';

type TimerSeverity = 'neutral' | 'warning' | 'danger';

const MINUTE = 60 * 1000;

const getElapsed = (createdAt?: string) => {
  if (!createdAt) return 0;
  const created = new Date(createdAt).getTime();
  if (Number.isNaN(created)) return 0;
  return Math.max(0, Date.now() - created);
};

const formatLabel = (elapsedMs: number) => {
  const minutes = Math.floor(elapsedMs / MINUTE);
  if (minutes <= 0) {
    return 'just now';
  }
  if (minutes < 60) {
    return `${minutes} min${minutes > 1 ? 's' : ''}`;
  }
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  if (hours >= 4) {
    return `${hours} hr${hours > 1 ? 's' : ''}`;
  }
  return `${hours}h ${remaining}m`;
};

const getSeverity = (elapsedMs: number): TimerSeverity => {
  const minutes = Math.floor(elapsedMs / MINUTE);
  if (minutes >= 15) return 'danger';
  if (minutes >= 10) return 'warning';
  return 'neutral';
};

export const useTicketTimer = (createdAt?: string) => {
  const [elapsedMs, setElapsedMs] = useState(() => getElapsed(createdAt));

  useEffect(() => {
    if (!createdAt) return;

    const tick = () => {
      setElapsedMs(getElapsed(createdAt));
    };

    tick();

    const id = window.setInterval(tick, 30 * 1000);
    return () => window.clearInterval(id);
  }, [createdAt]);

  const computed = useMemo(() => {
    const label = formatLabel(elapsedMs);
    const severity = getSeverity(elapsedMs);
    const minutes = Math.floor(elapsedMs / MINUTE);
    return {
      label,
      severity,
      minutes,
    };
  }, [elapsedMs]);

  return computed;
};

export type TicketTimerResult = ReturnType<typeof useTicketTimer>;
