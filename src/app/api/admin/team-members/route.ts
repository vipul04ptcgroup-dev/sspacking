import { NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { getFirebaseAdmin } from '@/lib/firebase-admin';
import { requireAdminRequest } from '@/lib/request-auth';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const adminActor = await requireAdminRequest(request);
    const { adminAuth, adminDb } = getFirebaseAdmin();
    const body = await request.json() as {
      displayName?: string;
      email?: string;
      password?: string;
    };

    const displayName = body.displayName?.trim() || '';
    const email = body.email?.trim().toLowerCase() || '';
    const password = body.password?.trim() || '';

    if (!displayName || !email || !password) {
      return NextResponse.json({ error: 'Name, email, and password are required.' }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters.' }, { status: 400 });
    }

    const existing = await adminDb.collection('teamMembers').where('email', '==', email).limit(1).get();
    if (!existing.empty) {
      return NextResponse.json({ error: 'A team member with this email already exists.' }, { status: 409 });
    }

    try {
      const existingAuthUser = await adminAuth.getUserByEmail(email);
      if (existingAuthUser) {
        return NextResponse.json(
          { error: 'This email already exists in Firebase Auth. Use a different email for the team member.' },
          { status: 409 },
        );
      }
    } catch (error) {
      const firebaseError = error as { code?: string };
      if (firebaseError.code !== 'auth/user-not-found') {
        throw error;
      }
    }

    const authUser = await adminAuth.createUser({
      email,
      password,
      displayName,
      disabled: false,
    });

    const teamMemberRef = await adminDb.collection('teamMembers').add({
      uid: authUser.uid,
      email,
      displayName,
      active: true,
      createdBy: adminActor.email || adminActor.uid,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      lastLoginAt: null,
      lastLogoutAt: null,
    });

    await adminDb.collection('adminActivityLogs').add({
      action: 'create',
      entity: 'team_member',
      entityId: teamMemberRef.id,
      entityLabel: displayName,
      message: `Created team member "${displayName}"`,
      actorId: adminActor.uid,
      actorEmail: adminActor.email,
      actorName: adminActor.name,
      metadata: {
        email,
        uid: authUser.uid,
      },
      createdAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ id: teamMemberRef.id, uid: authUser.uid });
  } catch (error) {
    const firebaseError = error as { code?: string; message?: string };
    if (firebaseError.code?.startsWith('auth/')) {
      return NextResponse.json(
        { error: firebaseError.message || 'Failed to create team member.' },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create team member.' },
      { status: 500 },
    );
  }
}
