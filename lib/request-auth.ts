import 'server-only';

import { getFirebaseAdmin } from '@/lib/firebase-admin';

function getBearerToken(request: Request): string {
  const authHeader = request.headers.get('authorization') || request.headers.get('Authorization') || '';
  if (!authHeader.startsWith('Bearer ')) {
    throw new Error('Missing authorization token.');
  }

  return authHeader.slice('Bearer '.length).trim();
}

export async function requireAdminRequest(request: Request) {
  const { adminAuth, adminDb } = getFirebaseAdmin();
  const token = getBearerToken(request);
  const decodedToken = await adminAuth.verifyIdToken(token);
  const snap = await adminDb
    .collection('users')
    .where('uid', '==', decodedToken.uid)
    .where('role', '==', 'admin')
    .limit(1)
    .get();

  if (snap.empty) {
    throw new Error('Admin access required.');
  }

  const data = snap.docs[0].data();
  return {
    uid: decodedToken.uid,
    email: decodedToken.email || '',
    name: (data.displayName as string) || decodedToken.name || '',
  };
}

export async function requireTeamRequest(request: Request) {
  const { adminAuth, adminDb } = getFirebaseAdmin();
  const token = getBearerToken(request);
  const decodedToken = await adminAuth.verifyIdToken(token);
  const snap = await adminDb
    .collection('teamMembers')
    .where('uid', '==', decodedToken.uid)
    .limit(1)
    .get();

  if (snap.empty) {
    throw new Error('Team member access required.');
  }

  const docSnap = snap.docs[0];
  const data = docSnap.data();
  if (data.active === false) {
    throw new Error('This team account is inactive.');
  }

  return {
    id: docSnap.id,
    uid: decodedToken.uid,
    email: (data.email as string) || decodedToken.email || '',
    displayName: (data.displayName as string) || decodedToken.name || '',
  };
}
