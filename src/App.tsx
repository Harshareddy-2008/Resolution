/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import {
  collection,
  doc,
  onSnapshot,
  query,
  where,
} from 'firebase/firestore';
import {
  auth,
  cleanId,
  db,
  ensureInitialEcosystemData,
  handleFirestoreError,
  OperationType,
  signInWithGoogle,
  signOutUser,
} from './lib/firebase';
import {
  AuditLog,
  CoachingCenter,
  Company,
  Course,
  CourseEnrollment,
  EmailNotificationLog,
  JobApplication,
  JobListing,
  PlacementRecord,
  PortalRole,
  RetentionCheckIn,
  SalaryHistoryRecord,
  UserPrivateRecord,
  UserPublicProfile,
} from './types/resolution';
import { HomePortalView } from './components/HomePortalView';
import { UserPortalView } from './components/UserPortalView';
import { CompanyPortalView } from './components/CompanyPortalView';
import { CoachingPortalView } from './components/CoachingPortalView';
import { AdminPortalView } from './components/AdminPortalView';

const FALLBACK_JOBS: JobListing[] = [
  {
    id: 'job_fullstack_aris',
    companyId: 'comp_aris_systems',
    ownerId: 'demo_owner',
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
    status: 'active',
  },
  {
    id: 'job_data_veridian',
    companyId: 'comp_veridian_cloud',
    ownerId: 'demo_owner',
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
    status: 'active',
  },
  {
    id: 'job_cloud_aris',
    companyId: 'comp_aris_systems',
    ownerId: 'demo_owner',
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
    status: 'active',
  },
];

const FALLBACK_COURSES: Course[] = [
  {
    id: 'course_cloud_k8s_arch',
    centerId: 'center_apex_skill_institute',
    ownerId: 'demo_owner',
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
    placementAssistance: true,
    status: 'published',
  },
  {
    id: 'course_ml_data_eng',
    centerId: 'center_apex_skill_institute',
    ownerId: 'demo_owner',
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
    placementAssistance: true,
    status: 'published',
  },
];

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [activeView, setActiveView] = useState<'home' | PortalRole>('home');
  const [portalSubTab, setPortalSubTab] = useState<string | undefined>(undefined);
  const [seeding, setSeeding] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Live Firestore State
  const [jobs, setJobs] = useState<JobListing[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [coachingCenters, setCoachingCenters] = useState<CoachingCenter[]>([]);
  const [users, setUsers] = useState<UserPublicProfile[]>([]);
  const [userPrivate, setUserPrivate] = useState<UserPrivateRecord | null>(null);
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [placements, setPlacements] = useState<PlacementRecord[]>([]);
  const [retentionCheckIns, setRetentionCheckIns] = useState<RetentionCheckIn[]>([]);
  const [enrollments, setEnrollments] = useState<CourseEnrollment[]>([]);
  const [salaryHistory, setSalaryHistory] = useState<SalaryHistoryRecord[]>([]);
  const [emailLogs, setEmailLogs] = useState<EmailNotificationLog[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  // 1. Auth State Listener
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      setAuthReady(true);
      if (user) {
        setSeeding(true);
        try {
          await ensureInitialEcosystemData(
            user.uid,
            user.email || 'candidate@resolution.in',
            user.displayName || 'Aarav Sharma'
          );
        } catch (err) {
          console.error('Initialization check error:', err);
        } finally {
          setSeeding(false);
        }
      }
    });
    return () => unsub();
  }, []);

  // 2. Public Collections Listeners (Jobs, Courses, Companies, Coaching Centers)
  useEffect(() => {
    const qJobs = query(collection(db, 'jobs'), where('status', '==', 'active'));
    const unsubJobs = onSnapshot(
      qJobs,
      (snap) => {
        setJobs(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<JobListing, 'id'>) })));
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'jobs')
    );

    const qCourses = query(collection(db, 'courses'), where('status', '==', 'published'));
    const unsubCourses = onSnapshot(
      qCourses,
      (snap) => {
        setCourses(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Course, 'id'>) })));
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'courses')
    );

    const qCompanies = query(
      collection(db, 'companies'),
      where('verificationStatus', 'in', ['verified', 'pending'])
    );
    const unsubCompanies = onSnapshot(
      qCompanies,
      (snap) => {
        setCompanies(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Company, 'id'>) })));
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'companies')
    );

    const qCenters = query(
      collection(db, 'coachingCenters'),
      where('approvalStatus', 'in', ['approved', 'pending'])
    );
    const unsubCenters = onSnapshot(
      qCenters,
      (snap) => {
        setCoachingCenters(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<CoachingCenter, 'id'>) })));
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'coachingCenters')
    );

    return () => {
      unsubJobs();
      unsubCourses();
      unsubCompanies();
      unsubCenters();
    };
  }, []);

  // 3. Authenticated Collections Listeners
  useEffect(() => {
    if (!authReady || !currentUser) return;
    const uid = cleanId(currentUser.uid);
    const isAdminUser = currentUser.email === 'wasimakram99941@gmail.com';

    // Users list
    const qUsers = query(
      collection(db, 'users'),
      where('role', 'in', ['user', 'company', 'coaching'])
    );
    const unsubUsers = onSnapshot(
      qUsers,
      (snap) => {
        setUsers(snap.docs.map((d) => ({ id: d.id, ...(d.data() as UserPublicProfile) })));
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'users')
    );

    // Current user's private PII subcollection
    const unsubPrivate = onSnapshot(
      doc(db, 'users', uid, 'private', 'info'),
      (snap) => {
        if (snap.exists()) {
          setUserPrivate(snap.data() as UserPrivateRecord);
        }
      },
      (err) => handleFirestoreError(err, OperationType.GET, `users/${uid}/private/info`)
    );

    // Applications
    const qApps = isAdminUser
      ? collection(db, 'applications')
      : query(collection(db, 'applications'), where('candidateId', '==', uid));
    const unsubApps = onSnapshot(
      qApps,
      (snap) => {
        setApplications(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<JobApplication, 'id'>) })));
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'applications')
    );

    // Placements
    const qPlacements = isAdminUser
      ? collection(db, 'placements')
      : query(collection(db, 'placements'), where('candidateId', '==', uid));
    const unsubPlacements = onSnapshot(
      qPlacements,
      (snap) => {
        setPlacements(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<PlacementRecord, 'id'>) })));
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'placements')
    );

    // Retention Check-Ins
    const qRetention = isAdminUser
      ? collection(db, 'retentionCheckIns')
      : query(collection(db, 'retentionCheckIns'), where('candidateId', '==', uid));
    const unsubRetention = onSnapshot(
      qRetention,
      (snap) => {
        setRetentionCheckIns(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<RetentionCheckIn, 'id'>) })));
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'retentionCheckIns')
    );

    // Course Enrollments
    const qEnrollments = isAdminUser
      ? collection(db, 'enrollments')
      : query(collection(db, 'enrollments'), where('studentId', '==', uid));
    const unsubEnrollments = onSnapshot(
      qEnrollments,
      (snap) => {
        setEnrollments(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<CourseEnrollment, 'id'>) })));
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'enrollments')
    );

    // Salary History
    const qSalary = isAdminUser
      ? collection(db, 'salaryHistory')
      : query(collection(db, 'salaryHistory'), where('userId', '==', uid));
    const unsubSalary = onSnapshot(
      qSalary,
      (snap) => {
        setSalaryHistory(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<SalaryHistoryRecord, 'id'>) })));
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'salaryHistory')
    );

    // Email Notification Logs
    const qEmails = isAdminUser
      ? collection(db, 'emailNotifications')
      : query(collection(db, 'emailNotifications'), where('recipientId', '==', uid));
    const unsubEmails = onSnapshot(
      qEmails,
      (snap) => {
        setEmailLogs(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<EmailNotificationLog, 'id'>) })));
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'emailNotifications')
    );

    // Audit Logs (Admin only)
    let unsubAudit = () => {};
    if (isAdminUser) {
      unsubAudit = onSnapshot(
        collection(db, 'auditLogs'),
        (snap) => {
          setAuditLogs(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<AuditLog, 'id'>) })));
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'auditLogs')
      );
    }

    return () => {
      unsubUsers();
      unsubPrivate();
      unsubApps();
      unsubPlacements();
      unsubRetention();
      unsubEnrollments();
      unsubSalary();
      unsubEmails();
      unsubAudit();
    };
  }, [authReady, currentUser]);

  const handleSignIn = async () => {
    setAuthError(null);
    try {
      await signInWithGoogle();
    } catch (err: any) {
      setAuthError(err.message || 'Authentication failed.');
    }
  };

  const handleSelectPortal = (portal: PortalRole, initialTab?: string) => {
    setPortalSubTab(initialTab);
    setActiveView(portal);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const displayJobs = jobs.length > 0 ? jobs : FALLBACK_JOBS;
  const displayCourses = courses.length > 0 ? courses : FALLBACK_COURSES;
  const currentUserProfile =
    users.find((u) => u.uid === (currentUser ? cleanId(currentUser.uid) : '')) || null;

  const chk90 = retentionCheckIns.filter((c) => c.checkpointDays === 90);
  const chk90Known = chk90.filter((c) => c.employmentStatus !== 'Unknown');
  const chk90Employed = chk90.filter((c) => c.employmentStatus === 'Employed');
  const retentionRate90d =
    chk90Known.length > 0 ? Math.round((chk90Employed.length / chk90Known.length) * 100) : 100;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Strict 3-Zone Top Bar Contract */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-xs border-b border-slate-200">
        <div className="max-w-[1360px] mx-auto flex items-center justify-between gap-8 px-6 py-4">
          {/* Zone 1: Single text element Brand Wordmark */}
          <button
            onClick={() => setActiveView('home')}
            className="font-display text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0 cursor-pointer"
          >
            RESOLUTION
          </button>

          {/* Zone 2: 5 Concise Single-Line Navigation Links */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
            <button
              onClick={() => setActiveView('home')}
              className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeView === 'home' ? 'text-slate-900 font-semibold underline underline-offset-4' : ''
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => handleSelectPortal('user', 'dashboard')}
              className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeView === 'user' ? 'text-teal-700 font-semibold underline underline-offset-4' : ''
              }`}
            >
              User Portal
            </button>
            <button
              onClick={() => handleSelectPortal('company', 'dashboard')}
              className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeView === 'company' ? 'text-teal-700 font-semibold underline underline-offset-4' : ''
              }`}
            >
              Company Portal
            </button>
            <button
              onClick={() => handleSelectPortal('coaching', 'dashboard')}
              className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeView === 'coaching' ? 'text-teal-700 font-semibold underline underline-offset-4' : ''
              }`}
            >
              Coaching Portal
            </button>
            <button
              onClick={() => handleSelectPortal('admin', 'overview')}
              className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeView === 'admin' ? 'text-teal-700 font-semibold underline underline-offset-4' : ''
              }`}
            >
              Admin Portal
            </button>
          </nav>

          {/* Zone 3: 1 Primary Action Button */}
          <div className="flex items-center gap-3 shrink-0">
            {currentUser ? (
              <button
                onClick={signOutUser}
                className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Sign Out ({currentUser.displayName?.split(' ')[0] || 'Account'})
              </button>
            ) : (
              <button
                onClick={handleSignIn}
                className="px-4 py-2 text-xs font-semibold text-white bg-teal-600 rounded-lg hover:bg-teal-500 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Sign In with Google
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Mobile Portal Switcher Bar */}
      <div className="md:hidden bg-white border-b border-slate-200 px-4 py-2 flex items-center gap-2 overflow-x-auto">
        {[
          { id: 'home', label: 'Overview' },
          { id: 'user', label: 'User Portal' },
          { id: 'company', label: 'Company' },
          { id: 'coaching', label: 'Coaching' },
          { id: 'admin', label: 'Admin' },
        ].map((item) => (
          <button
            key={item.id}
            onClick={() =>
              item.id === 'home' ? setActiveView('home') : handleSelectPortal(item.id as PortalRole)
            }
            className={`px-3 py-1 text-xs font-semibold rounded-md whitespace-nowrap shrink-0 ${
              activeView === item.id ? 'bg-slate-900 text-white' : 'text-slate-600 bg-slate-100'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* Main Content Area */}
      {activeView === 'home' ? (
        <HomePortalView
          jobs={displayJobs}
          courses={displayCourses}
          stats={{
            totalUsers: users.length,
            activeJobs: displayJobs.length,
            verifiedCompanies: companies.filter((c) => c.verificationStatus === 'verified').length,
            confirmedPlacements: placements.length,
            retentionRate90d,
          }}
          isAuthenticated={Boolean(currentUser)}
          onSelectPortal={handleSelectPortal}
          onSignIn={handleSignIn}
        />
      ) : !currentUser ? (
        <div className="max-w-xl mx-auto px-6 py-20">
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center space-y-5">
            <p className="text-xs font-semibold text-teal-700 uppercase">
              AUTHENTICATION REQUIRED · {activeView.toUpperCase()} PORTAL
            </p>
            <h2 className="text-2xl font-bold text-slate-900">
              Sign In to Access the {activeView.charAt(0).toUpperCase() + activeView.slice(1)} Portal
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              RESOLUTION protects personal career dossiers, PDF resume extractions, salary records, and 90/180/365-day
              retention check-ins using verified Firebase Authentication and zero-trust Firestore security rules.
            </p>
            {authError && (
              <p className="text-xs text-red-700 bg-red-50 border border-red-200 p-3 rounded-lg">{authError}</p>
            )}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <button
                onClick={handleSignIn}
                className="w-full sm:w-auto px-6 py-3 bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
              >
                Continue with Google Sign-In
              </button>
              <button
                onClick={() => setActiveView('home')}
                className="w-full sm:w-auto px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-lg transition-colors cursor-pointer"
              >
                Return to Homepage
              </button>
            </div>
          </div>
        </div>
      ) : seeding ? (
        <div className="max-w-xl mx-auto px-6 py-24 text-center space-y-3">
          <p className="text-sm font-bold text-slate-900">Initializing Live RESOLUTION Firestore Workspace...</p>
          <p className="text-xs text-slate-500">
            Syncing verified companies, job listings, courses, placements, and 90/180/365-day retention cohorts.
          </p>
        </div>
      ) : (
        <>
          {activeView === 'user' && (
            <UserPortalView
              key={`user-${portalSubTab || 'dashboard'}`}
              currentUserUid={cleanId(currentUser.uid)}
              currentUserEmail={currentUser.email || ''}
              userProfile={currentUserProfile}
              userPrivate={userPrivate}
              jobs={displayJobs}
              courses={displayCourses}
              applications={applications}
              enrollments={enrollments}
              salaryHistory={salaryHistory}
              retentionCheckIns={retentionCheckIns}
              initialTab={portalSubTab || 'dashboard'}
            />
          )}

          {activeView === 'company' && (
            <CompanyPortalView
              key={`company-${portalSubTab || 'dashboard'}`}
              currentUserUid={cleanId(currentUser.uid)}
              currentUserEmail={currentUser.email || ''}
              companies={companies}
              jobs={displayJobs}
              applications={applications}
              placements={placements}
              candidates={users}
              initialTab={portalSubTab || 'dashboard'}
            />
          )}

          {activeView === 'coaching' && (
            <CoachingPortalView
              key={`coaching-${portalSubTab || 'dashboard'}`}
              currentUserUid={cleanId(currentUser.uid)}
              currentUserEmail={currentUser.email || ''}
              coachingCenters={coachingCenters}
              courses={displayCourses}
              enrollments={enrollments}
              jobs={displayJobs}
              initialTab={portalSubTab || 'dashboard'}
            />
          )}

          {activeView === 'admin' && (
            <AdminPortalView
              key={`admin-${portalSubTab || 'overview'}`}
              currentUserUid={cleanId(currentUser.uid)}
              currentUserEmail={currentUser.email || ''}
              users={users}
              companies={companies}
              coachingCenters={coachingCenters}
              jobs={displayJobs}
              applications={applications}
              placements={placements}
              enrollments={enrollments}
              retentionCheckIns={retentionCheckIns}
              salaryHistory={salaryHistory}
              emailLogs={emailLogs}
              auditLogs={auditLogs}
              courses={displayCourses}
              initialTab={portalSubTab || 'overview'}
            />
          )}
        </>
      )}
    </div>
  );
}
