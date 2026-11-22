'use client';

import { useState, useTransition } from 'react';
import { CheckCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { markNotificationsRead } from '@/server/admin/common';

export function MarkAllRead({ ids }: { ids: string[] }) {
  const [pending, start] = useTransition();
  const [done, setDone] = useState(false);
  if (!ids.length || done) return null;
  return (
    <Button size="sm" variant="outline" disabled={pending} onClick={() => start(async () => { await markNotificationsRead(ids); setDone(true); })}>
      <CheckCheck className="size-4" /> Tout marquer comme lu
    </Button>
  );
}
