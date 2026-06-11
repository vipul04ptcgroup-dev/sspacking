import { NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { getFirebaseAdmin } from '@/lib/firebase-admin';
import { requireAdminRequest } from '@/lib/request-auth';

export const runtime = 'nodejs';

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const adminActor = await requireAdminRequest(request);
    const { id } = await context.params;
    const { adminAuth, adminDb } = getFirebaseAdmin();

    const docRef = adminDb.collection('teamMembers').doc(id);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return NextResponse.json({ error: 'Team member not found.' }, { status: 404 });
    }

    const data = docSnap.data() || {};
    const uid = (data.uid as string) || '';
    const displayName = (data.displayName as string) || id;
    const email = (data.email as string) || '';

    if (uid) {
      await adminAuth.deleteUser(uid);
    }

    await docRef.delete();

    await adminDb.collection('adminActivityLogs').add({
      action: 'delete',
      entity: 'team_member',
      entityId: id,
      entityLabel: displayName,
      message: `Deleted team member "${displayName}"`,
      actorId: adminActor.uid,
      actorEmail: adminActor.email,
      actorName: adminActor.name,
      metadata: {
        email,
        uid: uid || null,
      },
      createdAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete team member.' },
      { status: 500 },
    );
  }
}
