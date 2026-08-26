import React from 'react';
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import TimetableDashboard from '@/components/TimetableDashboard';

export default async function UserPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/');
  }

  return <TimetableDashboard initialPortalMode="client" initialViewMode="app" />;
}
