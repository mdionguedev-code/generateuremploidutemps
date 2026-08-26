import { NextRequest, NextResponse } from 'next/server';
import { generateTimetable } from '@/lib/solver';
import { createClient } from '@/utils/supabase/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { subjects, teachers, classes, activeDays, totalSlots, title = 'Emploi du temps généré' } = body;

    if (!Array.isArray(subjects) || !Array.isArray(teachers) || !Array.isArray(classes)) {
      return NextResponse.json(
        { error: 'Données invalides ou manquantes (sujets, enseignants, classes doivent être des tableaux).' },
        { status: 400 }
      );
    }

    const result = generateTimetable(subjects, teachers, classes, activeDays, totalSlots);

    // Save to Supabase if authenticated
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      const { error: dbError } = await supabase.from('timetables').insert({
        user_id: user.id,
        title: title,
        data: {
          inputs: { subjects, teachers, classes, activeDays, totalSlots },
          result: result
        }
      });
      if (dbError) {
        console.error('Error saving to DB:', dbError);
      }
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error generating timetable:', error);
    return NextResponse.json(
      { error: `Erreur interne de génération: ${error?.message || error}` },
      { status: 500 }
    );
  }
}
