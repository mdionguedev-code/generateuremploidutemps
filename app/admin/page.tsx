import React from 'react';
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import TimetableDashboard from '@/components/TimetableDashboard';

export default async function AdminPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  const isMasterAdmin = user.email?.toLowerCase() === 'diongpaco@gmail.com';
  if (isMasterAdmin && profile?.role !== 'admin') {
    try {
      await supabase.from('profiles').upsert({ id: user.id, email: user.email, role: 'admin' }, { onConflict: 'id' });
    } catch (e) {
      console.error(e);
    }
  } else if (!profile || profile.role !== 'admin') {
    redirect('/user');
  }

  return <TimetableDashboard initialPortalMode="admin" initialViewMode="app" />;
}
