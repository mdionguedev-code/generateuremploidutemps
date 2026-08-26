import { NextRequest, NextResponse } from 'next/server';
import { generateTimetable } from '@/lib/solver';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { subjects, teachers, classes, activeDays, totalSlots } = body;

    if (!Array.isArray(subjects) || !Array.isArray(teachers) || !Array.isArray(classes)) {
      return NextResponse.json(
        { error: 'Données invalides ou manquantes (sujets, enseignants, classes doivent être des tableaux).' },
        { status: 400 }
      );
    }

    const result = generateTimetable(subjects, teachers, classes, activeDays, totalSlots);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error generating timetable:', error);
    return NextResponse.json(
      { error: `Erreur interne de génération: ${error?.message || error}` },
      { status: 500 }
    );
  }
}
