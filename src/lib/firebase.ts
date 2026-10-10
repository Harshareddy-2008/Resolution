import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut as fbSignOut } from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  serverTimestamp,
  getDocFromServer,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Validate connection to Firestore on boot (Mandatory per firebase-integration-rpc skill)
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}
testConnection();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Defensive payload helpers synced verbatim with firebase-blueprint.json maxLength & pattern constraints
export function cleanString(val: unknown, maxLen: number, fallback = ''): string {
  if (typeof val !== 'string') return fallback;
  return val.trim().slice(0, maxLen);
}

export function cleanId(val: string): string {
  const cleaned = val.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 128);
  return cleaned.length > 0 ? cleaned : 'doc_' + Date.now();
}

export function cleanStringArray(arr: unknown, maxItems: number, maxItemLen = 120): string[] {
  if (!Array.isArray(arr)) return [];
  return arr
    .map((item) => (typeof item === 'string' ? item.trim().slice(0, maxItemLen) : ''))
    .filter((s) => s.length > 0)
    .slice(0, maxItems);
}

export async function signInWithGoogle() {
  const result = await signInWithPopup(auth, googleProvider);
  return result.user;
}

export async function signOutUser() {
  await fbSignOut(auth);
}

export async function recordAuditLog(action: string, targetType: string, targetId: string, details: string) {
  const user = auth.currentUser;
  if (!user) return;
  const logId = cleanId(`audit_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`);
  const path = `auditLogs/${logId}`;
  try {
    await setDoc(doc(db, 'auditLogs', logId), {
      actorId: cleanId(user.uid),
      actorEmail: cleanString(user.email || 'unknown@resolution.org', 254),
      action: cleanString(action, 160),
      targetType: cleanString(targetType, 80),
      targetId: cleanString(targetId, 128),
      details: cleanString(details, 1000),
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export function addDaysToDateString(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) {
    const fallback = new Date();
    fallback.setDate(fallback.getDate() + days);
    return fallback.toISOString().split('T')[0];
  }
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

/**
 * Seeds initial realistic ecosystem records into Firestore on first authenticated session
 * if the database is empty, so all 4 portals operate on live persistent Firestore records immediately.
 */
export async function ensureInitialEcosystemData(uid: string, userEmail: string, userName: string) {
  const validUid = cleanId(uid);
  // Check if jobs already exist
  try {
    const existingJobs = await getDocs(collection(db, 'jobs'));
    if (!existingJobs.empty) {
      return false;
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'jobs');
  }

  // 1. Ensure current user public profile & private record exist
  const userDocRef = doc(db, 'users', validUid);
  const userSnap = await getDoc(userDocRef);
  if (!userSnap.exists()) {
    await setDoc(userDocRef, {
      uid: validUid,
      displayName: cleanString(userName || 'Aarav Sharma', 120),
      role: 'user',
      careerStatus: 'graduated_unemployed',
      highestQualification: 'B.Tech in Computer Science',
      collegeName: 'National Institute of Technology, Karnataka',
      graduationYear: '2025',
      fieldOfStudy: 'Computer Science & Engineering',
      city: 'Bengaluru',
      state: 'Karnataka',
      country: 'India',
      skills: ['TypeScript', 'React', 'Node.js', 'PostgreSQL', 'Python', 'SQL'],
      targetRoles: ['Full-Stack Engineer', 'Backend Software Engineer', 'Data Engineer'],
      resumeSummary:
        'Computer Science graduate with hands-on project experience building full-stack web applications in TypeScript, React, and PostgreSQL. Completed cloud architecture coursework and a 6-month software engineering internship.',
      readinessScore: 84,
      yearsOfExperience: 1,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    await setDoc(doc(db, 'users', validUid, 'private', 'info'), {
      userId: validUid,
      email: cleanString(userEmail || 'candidate@resolution.in', 254),
      mobileNumber: '+91 98450 11223',
      dateOfBirth: '2003-05-14',
      gender: 'Prefer not to say',
      postalCode: '560001',
      expectedSalary: 1150000,
      privacyConsent: true,
      emailNotificationsConsent: true,
      resumeFileName: 'Aarav_Sharma_Resume_2026.pdf',
      updatedAt: serverTimestamp(),
    });
  }

  // 2. Seed Verified Companies
  const comp1Id = 'comp_aris_systems';
  const comp2Id = 'comp_veridian_cloud';
  await setDoc(doc(db, 'companies', comp1Id), {
    ownerId: validUid,
    companyName: 'Aris Enterprise Systems',
    officialEmail: 'talent@arissystems.in',
    contactPerson: 'Meera Krishnan',
    contactNumber: '+91 80 4092 8800',
    website: 'https://arissystems.example.com',
    description: 'Enterprise cloud infrastructure, financial ledger engineering, and distributed data systems.',
    industry: 'Software & Cloud Infrastructure',
    companySize: '500-1,000 Employees',
    yearEstablished: '2016',
    headquarters: 'Bengaluru, India',
    country: 'India',
    state: 'Karnataka',
    city: 'Bengaluru',
    officeAddress: 'Tower B, Prestige Tech Park, Outer Ring Road, Bengaluru',
    verificationStatus: 'verified',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  await setDoc(doc(db, 'companies', comp2Id), {
    ownerId: validUid,
    companyName: 'Veridian FinTech Labs',
    officialEmail: 'careers@veridianfintech.in',
    contactPerson: 'Rohan Deshmukh',
    contactNumber: '+91 22 6120 4400',
    website: 'https://veridianfintech.example.com',
    description: 'Real-time payment risk analytics, regulatory compliance automation, and core banking APIs.',
    industry: 'FinTech & Data Analytics',
    companySize: '200-500 Employees',
    yearEstablished: '2019',
    headquarters: 'Mumbai, India',
    country: 'India',
    state: 'Maharashtra',
    city: 'Mumbai',
    officeAddress: 'Bandra Kurla Complex, G Block, Mumbai',
    verificationStatus: 'verified',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  // 3. Seed Active Job Listings
  const job1Id = 'job_fullstack_aris';
  const job2Id = 'job_data_veridian';
  const job3Id = 'job_cloud_aris';

  await setDoc(doc(db, 'jobs', job1Id), {
    companyId: comp1Id,
    ownerId: validUid,
    companyName: 'Aris Enterprise Systems',
    title: 'Full-Stack Software Engineer (TypeScript & Cloud)',
    department: 'Core Platform Engineering',
    industry: 'Software & Cloud Infrastructure',
    description:
      'Design and maintain high-throughput full-stack applications using React, TypeScript, Node.js, and PostgreSQL. Collaborate with product and security architects on scalable microservices.',
    requiredSkills: ['TypeScript', 'React', 'Node.js', 'PostgreSQL', 'REST APIs'],
    preferredSkills: ['Docker', 'Kubernetes', 'System Design', 'Redis'],
    educationalQualifications: 'B.Tech / B.E. / M.Tech in Computer Science or Information Technology',
    requiredExperience: '0 - 2 Years',
    vacancies: 4,
    employmentType: 'Full-time',
    workMode: 'Hybrid',
    location: 'Bengaluru, India',
    country: 'India',
    salaryMin: 1000000,
    salaryMax: 1500000,
    currency: 'INR',
    benefits: 'Comprehensive health insurance, annual learning stipend of INR 75,000, hybrid commuter allowance',
    deadline: '2026-11-30',
    interviewProcess: '1. Online Architecture Assessment · 2. Technical Pair Programming · 3. Engineering Manager Review',
    requiredCertifications: 'Optional: AWS Certified Developer or equivalent portfolio',
    status: 'active',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  await setDoc(doc(db, 'jobs', job2Id), {
    companyId: comp2Id,
    ownerId: validUid,
    companyName: 'Veridian FinTech Labs',
    title: 'Applied Data & ML Risk Engineer',
    department: 'Risk Intelligence',
    industry: 'FinTech & Data Analytics',
    description:
      'Build real-time fraud detection pipelines, feature stores, and explainable ML scoring models for high-volume payment rails.',
    requiredSkills: ['Python', 'SQL', 'Machine Learning', 'Data Modeling', 'PostgreSQL'],
    preferredSkills: ['PyTorch', 'Apache Kafka', 'Cloud Computing'],
    educationalQualifications: 'B.Tech / M.Sc / M.Tech in Computer Science, Data Science, or Mathematics',
    requiredExperience: '1 - 3 Years',
    vacancies: 3,
    employmentType: 'Full-time',
    workMode: 'Remote',
    location: 'Mumbai, India',
    country: 'India',
    salaryMin: 1200000,
    salaryMax: 1850000,
    currency: 'INR',
    benefits: 'Remote workstation grant, equity participation, family medical coverage',
    deadline: '2026-12-15',
    interviewProcess: '1. SQL & Data Modeling Case · 2. ML Pipeline Deep-Dive · 3. Final Leadership Round',
    requiredCertifications: 'None mandatory',
    status: 'active',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  await setDoc(doc(db, 'jobs', job3Id), {
    companyId: comp1Id,
    ownerId: validUid,
    companyName: 'Aris Enterprise Systems',
    title: 'Cloud Security & DevSecOps Intern',
    department: 'Infrastructure Security',
    industry: 'Software & Cloud Infrastructure',
    description:
      '6-month stipend internship with direct PPO pathway. Automate container vulnerability scanning, IAM least-privilege policies, and CI/CD pipelines.',
    requiredSkills: ['Linux', 'Docker', 'Python', 'Git'],
    preferredSkills: ['Kubernetes', 'Terraform', 'Cybersecurity'],
    educationalQualifications: 'Pursuing final-year Undergraduate or Postgraduate degree in CS / ECE',
    requiredExperience: 'Internship / Entry-Level',
    vacancies: 6,
    employmentType: 'Internship',
    workMode: 'On-site',
    location: 'Bengaluru, India',
    country: 'India',
    salaryMin: 480000,
    salaryMax: 650000,
    currency: 'INR',
    benefits: 'Pre-placement offer eligibility, mentorship by Principal Security Engineers',
    deadline: '2026-11-20',
    interviewProcess: '1. Linux & Networking Screen · 2. Security Automation Lab',
    requiredCertifications: 'None required',
    status: 'active',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  // 4. Seed Approved Coaching Centers & Courses
  const center1Id = 'center_apex_skill_institute';
  await setDoc(doc(db, 'coachingCenters', center1Id), {
    ownerId: validUid,
    centerName: 'Apex Systems & Cloud Academy',
    officialEmail: 'admissions@apexacademy.in',
    contactNumber: '+91 80 2291 5500',
    website: 'https://apexacademy.example.com',
    description:
      'Accredited engineering institute specializing in production cloud architecture, distributed databases, and applied AI.',
    country: 'India',
    state: 'Karnataka',
    city: 'Bengaluru',
    address: 'Indiranagar 100 Feet Road, Bengaluru',
    trainingMode: 'Hybrid',
    domains: ['Cloud Computing', 'Web Development', 'Data Science', 'Cybersecurity'],
    trainerDetails: 'Lead Instructor: Dr. Vikramaditya Nair (14 yrs Principal Architect experience)',
    accreditation: 'NSDC & AICTE Industry Skill Partner #IND-2024-889',
    approvalStatus: 'approved',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  const course1Id = 'course_cloud_k8s_arch';
  const course2Id = 'course_ml_data_eng';

  await setDoc(doc(db, 'courses', course1Id), {
    centerId: center1Id,
    ownerId: validUid,
    centerName: 'Apex Systems & Cloud Academy',
    courseName: 'Production Kubernetes, Docker & Distributed System Design',
    category: 'Cloud Computing',
    description:
      'Bridge the gap between full-stack coding and enterprise cloud deployment. Covers container orchestration, Redis caching, CI/CD, and high-availability system design.',
    skillsTaught: ['Docker', 'Kubernetes', 'System Design', 'Redis', 'CI/CD'],
    level: 'Intermediate',
    duration: '8 Weeks (64 Hours)',
    fees: 18500,
    currency: 'INR',
    deliveryMode: 'Hybrid',
    startDate: '2026-11-01',
    endDate: '2026-12-27',
    schedule: 'Sat & Sun · 10:00 AM - 2:00 PM IST',
    prerequisites: 'Working knowledge of JavaScript/TypeScript or Python and basic Linux commands',
    trainerInfo: 'Dr. Vikramaditya Nair & Senior SRE Mentors',
    certificationDetails: 'Verifiable RESOLUTION + Apex Accredited Cloud Architect Certificate',
    syllabus:
      'Module 1: Container Internals & Docker · Module 2: Kubernetes Clusters & Ingress · Module 3: Distributed Caching & Redis · Module 4: Production Capstone',
    capacity: 40,
    placementAssistance: true,
    status: 'published',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  await setDoc(doc(db, 'courses', course2Id), {
    centerId: center1Id,
    ownerId: validUid,
    centerName: 'Apex Systems & Cloud Academy',
    courseName: 'Applied Data Engineering, SQL Optimization & ML Pipelines',
    category: 'Data Science',
    description:
      'Intensive cohort covering analytical SQL window functions, feature stores, Apache Kafka event streaming, and production ML deployment.',
    skillsTaught: ['Machine Learning', 'Apache Kafka', 'Data Modeling', 'SQL', 'PyTorch'],
    level: 'Advanced',
    duration: '10 Weeks (80 Hours)',
    fees: 24000,
    currency: 'INR',
    deliveryMode: 'Online',
    startDate: '2026-11-10',
    endDate: '2027-01-20',
    schedule: 'Tue, Thu & Sat · 7:00 PM - 9:30 PM IST',
    prerequisites: 'Proficiency in Python and relational databases',
    trainerInfo: 'Ananya Sen (Staff Data Scientist)',
    certificationDetails: 'Capstone-verified Data & ML Engineering Credential',
    syllabus:
      'Module 1: High-Performance PostgreSQL · Module 2: Event Streaming with Kafka · Module 3: Explainable ML Models · Module 4: FinTech Risk Capstone',
    capacity: 35,
    placementAssistance: true,
    status: 'published',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  // 5. Seed Initial Job Application & Enrollment for current user
  await setDoc(doc(db, 'applications', 'app_initial_demo'), {
    jobId: job1Id,
    jobTitle: 'Full-Stack Software Engineer (TypeScript & Cloud)',
    companyId: comp1Id,
    companyOwnerId: validUid,
    companyName: 'Aris Enterprise Systems',
    candidateId: validUid,
    candidateName: cleanString(userName || 'Aarav Sharma', 120),
    candidateEmail: cleanString(userEmail || 'candidate@resolution.in', 254),
    candidateQualification: 'B.Tech in Computer Science',
    candidateSkills: ['TypeScript', 'React', 'Node.js', 'PostgreSQL', 'Python', 'SQL'],
    matchScore: 88,
    matchExplanation:
      'Matches 4 of 5 core required skills (TypeScript, React, Node.js, PostgreSQL). Enrolling in Docker/Kubernetes will close the remaining preferred skill gap.',
    status: 'Shortlisted',
    interviewDate: '2026-10-24',
    offeredSalary: 1350000,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  await setDoc(doc(db, 'enrollments', 'enroll_initial_demo'), {
    courseId: course1Id,
    courseName: 'Production Kubernetes, Docker & Distributed System Design',
    centerId: center1Id,
    centerOwnerId: validUid,
    centerName: 'Apex Systems & Cloud Academy',
    studentId: validUid,
    studentName: cleanString(userName || 'Aarav Sharma', 120),
    skillsTaught: ['Docker', 'Kubernetes', 'System Design', 'Redis', 'CI/CD'],
    progressPercent: 75,
    status: 'In Progress',
    certificateIssued: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  // 6. Seed Confirmed Placement & 90 / 180 / 365-Day Retention Cohort Checkpoints
  const placement1Id = 'place_cohort_1';
  await setDoc(doc(db, 'placements', placement1Id), {
    candidateId: validUid,
    candidateName: cleanString(userName || 'Aarav Sharma', 120),
    candidateEmail: cleanString(userEmail || 'candidate@resolution.in', 254),
    jobId: job1Id,
    jobTitle: 'Full-Stack Software Engineer (TypeScript & Cloud)',
    companyId: comp1Id,
    companyOwnerId: validUid,
    companyName: 'Aris Enterprise Systems',
    designation: 'Software Engineer I',
    joiningDate: '2026-01-15',
    workLocation: 'Bengaluru, India',
    offeredSalary: 1250000,
    currency: 'INR',
    employmentType: 'Full-time',
    status: 'confirmed',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  // 90-day check-in (Confirmed Employed with Original Employer)
  await setDoc(doc(db, 'retentionCheckIns', 'chk_90_place1'), {
    placementId: placement1Id,
    candidateId: validUid,
    candidateName: cleanString(userName || 'Aarav Sharma', 120),
    candidateEmail: cleanString(userEmail || 'candidate@resolution.in', 254),
    companyId: comp1Id,
    companyOwnerId: validUid,
    companyName: 'Aris Enterprise Systems',
    designation: 'Software Engineer I',
    joiningDate: '2026-01-15',
    checkpointDays: 90,
    dueDate: '2026-04-15',
    emailStatus: 'Sent',
    responseDate: '2026-04-16',
    employmentStatus: 'Employed',
    remainsWithOriginalCompany: true,
    currentEmployer: 'Aris Enterprise Systems',
    reportedSalary: 1250000,
    verificationStatus: 'Candidate Confirmed',
    status: 'Confirmed Employed',
    assistanceRequested: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  // 180-day check-in (Confirmed Employed + Salary Appraisal)
  await setDoc(doc(db, 'retentionCheckIns', 'chk_180_place1'), {
    placementId: placement1Id,
    candidateId: validUid,
    candidateName: cleanString(userName || 'Aarav Sharma', 120),
    candidateEmail: cleanString(userEmail || 'candidate@resolution.in', 254),
    companyId: comp1Id,
    companyOwnerId: validUid,
    companyName: 'Aris Enterprise Systems',
    designation: 'Software Engineer II',
    joiningDate: '2026-01-15',
    checkpointDays: 180,
    dueDate: '2026-07-14',
    emailStatus: 'Sent',
    responseDate: '2026-07-15',
    employmentStatus: 'Employed',
    remainsWithOriginalCompany: true,
    currentEmployer: 'Aris Enterprise Systems',
    reportedSalary: 1420000,
    verificationStatus: 'Candidate Confirmed',
    status: 'Confirmed Employed',
    assistanceRequested: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  // 365-day check-in (Awaiting Response / Scheduled so user can test responding live!)
  await setDoc(doc(db, 'retentionCheckIns', 'chk_365_place1'), {
    placementId: placement1Id,
    candidateId: validUid,
    candidateName: cleanString(userName || 'Aarav Sharma', 120),
    candidateEmail: cleanString(userEmail || 'candidate@resolution.in', 254),
    companyId: comp1Id,
    companyOwnerId: validUid,
    companyName: 'Aris Enterprise Systems',
    designation: 'Software Engineer II',
    joiningDate: '2026-01-15',
    checkpointDays: 365,
    dueDate: '2027-01-15',
    emailStatus: 'Sent',
    employmentStatus: 'Unknown',
    remainsWithOriginalCompany: true,
    currentEmployer: 'Aris Enterprise Systems',
    reportedSalary: 1420000,
    verificationStatus: 'Unverified',
    status: 'Awaiting Response',
    assistanceRequested: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  // 7. Seed Salary History Timeline
  await setDoc(doc(db, 'salaryHistory', 'sal_1_initial'), {
    userId: validUid,
    userName: cleanString(userName || 'Aarav Sharma', 120),
    recordType: 'Initial',
    companyName: 'Prior Internship Stipend',
    designation: 'Software Engineering Intern',
    industry: 'Software & Cloud Infrastructure',
    annualSalary: 600000,
    currency: 'INR',
    verificationType: 'Self-Reported',
    skillsAtTime: ['TypeScript', 'React', 'SQL'],
    effectiveDate: '2025-06-01',
    createdAt: serverTimestamp(),
  });

  await setDoc(doc(db, 'salaryHistory', 'sal_2_placement'), {
    userId: validUid,
    userName: cleanString(userName || 'Aarav Sharma', 120),
    recordType: 'Placement',
    companyName: 'Aris Enterprise Systems',
    designation: 'Software Engineer I',
    industry: 'Software & Cloud Infrastructure',
    annualSalary: 1250000,
    currency: 'INR',
    verificationType: 'Employer-Verified',
    skillsAtTime: ['TypeScript', 'React', 'Node.js', 'PostgreSQL', 'Python'],
    effectiveDate: '2026-01-15',
    createdAt: serverTimestamp(),
  });

  await setDoc(doc(db, 'salaryHistory', 'sal_3_midyear'), {
    userId: validUid,
    userName: cleanString(userName || 'Aarav Sharma', 120),
    recordType: 'RetentionCheckIn',
    companyName: 'Aris Enterprise Systems',
    designation: 'Software Engineer II',
    industry: 'Software & Cloud Infrastructure',
    annualSalary: 1420000,
    currency: 'INR',
    verificationType: 'Self-Reported',
    skillsAtTime: ['TypeScript', 'React', 'Node.js', 'PostgreSQL', 'Docker', 'Kubernetes'],
    effectiveDate: '2026-07-15',
    createdAt: serverTimestamp(),
  });

  // 8. Seed Automated Email Notification Log
  await setDoc(doc(db, 'emailNotifications', 'email_log_90d'), {
    recipientId: validUid,
    recipientEmail: cleanString(userEmail || 'candidate@resolution.in', 254),
    recipientName: cleanString(userName || 'Aarav Sharma', 120),
    templateType: 'Retention_90_Day',
    subject: 'RESOLUTION — Your 90-Day Career Check-In',
    bodyPreview:
      'Hello Aarav, We hope your career journey as Software Engineer I at Aris Enterprise Systems is progressing well. Please securely confirm your 90-day employment status.',
    checkpointDays: 90,
    placementId: placement1Id,
    checkInId: 'chk_90_place1',
    deliveryStatus: 'Delivered',
    sentAt: '2026-04-15',
    createdAt: serverTimestamp(),
  });

  await recordAuditLog(
    'INITIALIZE_ECOSYSTEM_DATA',
    'System',
    validUid,
    'Initialized live Firestore records across companies, jobs, courses, placements, and retention cohorts.'
  );

  return true;
}
