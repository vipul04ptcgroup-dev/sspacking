import { NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { getFirebaseAdmin } from '@/lib/firebase-admin';
import { requireTeamRequest } from '@/lib/request-auth';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const teamMember = await requireTeamRequest(request);
    const { adminDb } = getFirebaseAdmin();
    const body = await request.json() as { type?: 'login' | 'logout' };
    const type = body.type;

    if (type !== 'login' && type !== 'logout') {
      return NextResponse.json({ error: 'Log type must be login or logout.' }, { status: 400 });
    }

    await adminDb.collection('teamAccessLogs').add({
      teamMemberId: teamMember.id,
      uid: teamMember.uid,
      email: teamMember.email,
      displayName: teamMember.displayName,
      type,
      createdAt: FieldValue.serverTimestamp(),
    });

    await adminDb.collection('teamMembers').doc(teamMember.id).update({
      ...(type === 'login'
        ? { lastLoginAt: FieldValue.serverTimestamp() }
        : { lastLogoutAt: FieldValue.serverTimestamp() }),
      updatedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to record team access log.' },
      { status: 500 },
    );
  }
}
