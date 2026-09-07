import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const rawNext = searchParams.get('next') ?? '/user';
  // Validation stricte anti-Open-Redirect : doit commencer par / sans // ni caractères d'échappement
  const safeNext = (rawNext.startsWith('/') && !rawNext.startsWith('//') && !rawNext.startsWith('/\\') && !rawNext.includes('\\'))
    ? rawNext
    : '/user';

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Check user profile role if needed
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .maybeSingle();

        const isMasterAdmin = user.email?.toLowerCase() === 'diongpaco@gmail.com';
        if (isMasterAdmin || profile?.role === 'admin') {
          if (isMasterAdmin && profile?.role !== 'admin') {
            try {
              await supabase.from('profiles').upsert({ id: user.id, email: user.email, role: 'admin' }, { onConflict: 'id' });
            } catch (e) {
              console.error(e);
            }
          }
          return NextResponse.redirect(`${origin}/admin`);
        }
      }
      return NextResponse.redirect(`${origin}${safeNext}`);
    } else {
      console.error('OAuth exchange code error:', error);
    }
  }

  // If there's an error, redirect to home with error query param
  return NextResponse.redirect(`${origin}/?auth_error=oauth_failed`);
}
