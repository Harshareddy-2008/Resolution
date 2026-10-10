/**
 * Security Rules Verification Suite for RESOLUTION
 * Verifies all Dirty Dozen adversarial payloads are rejected with PERMISSION_DENIED.
 */

export interface SecurityRuleAssertion {
  id: number;
  name: string;
  collectionPath: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete';
  authUid: string | null;
  emailVerified: boolean;
  payload?: Record<string, unknown>;
  expectedResult: 'PERMISSION_DENIED';
}

export const DIRTY_DOZEN_TESTS: SecurityRuleAssertion[] = [
  {
    id: 1,
    name: 'Privilege Escalation on User Creation (role: admin)',
    collectionPath: '/users/attacker1',
    operation: 'create',
    authUid: 'attacker1',
    emailVerified: true,
    payload: { uid: 'attacker1', displayName: 'Attacker', role: 'admin', careerStatus: 'undergraduate' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 2,
    name: 'Shadow Field Injection on User Profile',
    collectionPath: '/users/user1',
    operation: 'create',
    authUid: 'user1',
    emailVerified: true,
    payload: { uid: 'user1', displayName: 'User', role: 'user', careerStatus: 'undergraduate', isVerifiedAdmin: true },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 3,
    name: 'Cross-User PII Read on Private Subcollection',
    collectionPath: '/users/user1/private/info',
    operation: 'get',
    authUid: 'user2',
    emailVerified: true,
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 4,
    name: 'Forged Timestamp on Job Creation',
    collectionPath: '/jobs/job1',
    operation: 'create',
    authUid: 'recruiter1',
    emailVerified: true,
    payload: { companyId: 'comp1', ownerId: 'recruiter1', createdAt: '1999-01-01T00:00:00Z' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 5,
    name: 'Identity Spoofing on Job Application Creation',
    collectionPath: '/applications/app1',
    operation: 'create',
    authUid: 'user1',
    emailVerified: true,
    payload: { candidateId: 'user2', jobId: 'job1', status: 'Applied' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 6,
    name: 'Unauthorized Candidate Self-Hire Update',
    collectionPath: '/applications/app1',
    operation: 'update',
    authUid: 'user1',
    emailVerified: true,
    payload: { status: 'Hired' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 7,
    name: 'Oversized String Resource Poisoning',
    collectionPath: '/jobs/job1',
    operation: 'create',
    authUid: 'recruiter1',
    emailVerified: true,
    payload: { description: 'A'.repeat(10000) },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 8,
    name: 'Array Exhaustion Attack on Skills',
    collectionPath: '/users/user1',
    operation: 'create',
    authUid: 'user1',
    emailVerified: true,
    payload: { skills: new Array(100).fill('Skill') },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 9,
    name: 'Invalid Document ID Format',
    collectionPath: '/jobs/invalid id with spaces!',
    operation: 'create',
    authUid: 'recruiter1',
    emailVerified: true,
    payload: {},
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 10,
    name: 'Unverified Email Spoofing Attack',
    collectionPath: '/auditLogs/log1',
    operation: 'get',
    authUid: 'spoofedAdmin',
    emailVerified: false,
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 11,
    name: 'Salary History Owner Mutation',
    collectionPath: '/salaryHistory/sal1',
    operation: 'update',
    authUid: 'user1',
    emailVerified: true,
    payload: { userId: 'user2' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 12,
    name: 'Unfiltered List Query on Private Salary History',
    collectionPath: '/salaryHistory',
    operation: 'list',
    authUid: 'attacker1',
    emailVerified: true,
    expectedResult: 'PERMISSION_DENIED',
  },
];
