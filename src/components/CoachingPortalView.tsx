import React, { useState } from 'react';
import {
  Award,
  BookOpen,
  CheckCircle2,
  GraduationCap,
  Plus,
  Users,
  X,
} from 'lucide-react';
import { doc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import {
  CoachingCenter,
  Course,
  CourseEnrollment,
  JobListing,
} from '../types/resolution';
import {
  cleanId,
  cleanString,
  cleanStringArray,
  db,
  handleFirestoreError,
  OperationType,
} from '../lib/firebase';

interface CoachingPortalViewProps {
  currentUserUid: string;
  currentUserEmail: string;
  coachingCenters: CoachingCenter[];
  courses: Course[];
  enrollments: CourseEnrollment[];
  jobs: JobListing[];
  initialTab?: string;
}

export const CoachingPortalView: React.FC<CoachingPortalViewProps> = ({
  currentUserUid,
  currentUserEmail,
  coachingCenters,
  courses,
  enrollments,
  jobs,
  initialTab = 'dashboard',
}) => {
  const [activeTab, setActiveTab] = useState<string>(initialTab);
  const [statusBanner, setStatusBanner] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const myCenter = coachingCenters.find((c) => c.ownerId === currentUserUid) || coachingCenters[0];

  // Coaching Center Registration Form
  const [centerForm, setCenterForm] = useState({
    centerName: myCenter?.centerName || 'Apex Systems & Cloud Academy',
    officialEmail: myCenter?.officialEmail || currentUserEmail || 'admissions@apexacademy.in',
    contactNumber: myCenter?.contactNumber || '+91 80 2291 5500',
    website: myCenter?.website || 'https://apexacademy.example.com',
    description:
      myCenter?.description ||
      'Accredited technical training institute offering job-aligned courses in cloud, AI, and full-stack engineering.',
    country: myCenter?.country || 'India',
    state: myCenter?.state || 'Karnataka',
    city: myCenter?.city || 'Bengaluru',
    address: myCenter?.address || 'Indiranagar 100 Feet Road, Bengaluru',
    trainingMode: (myCenter?.trainingMode || 'Hybrid') as CoachingCenter['trainingMode'],
    domainsInput: (myCenter?.domains || ['Cloud Computing', 'Web Development', 'Data Science']).join(', '),
    trainerDetails: myCenter?.trainerDetails || 'Dr. Vikramaditya Nair & Senior Industry Mentors',
    accreditation: myCenter?.accreditation || 'NSDC & AICTE Skill Partner #IND-2024-889',
  });

  // Course Creation Form
  const [courseForm, setCourseForm] = useState({
    courseName: 'Full-Stack TypeScript, React & PostgreSQL Engineering',
    category: 'Web Development',
    description:
      'Comprehensive career-oriented bootcamp covering modern React, TypeScript, Express API design, relational schema modeling, and cloud deployment.',
    skillsTaughtInput: 'TypeScript, React, Node.js, PostgreSQL, REST APIs',
    level: 'Intermediate' as Course['level'],
    duration: '8 Weeks (60 Hours)',
    fees: 16500,
    currency: 'INR',
    deliveryMode: 'Hybrid' as Course['deliveryMode'],
    startDate: '2026-11-15',
    endDate: '2027-01-10',
    schedule: 'Sat & Sun · 10:00 AM - 1:30 PM IST',
    prerequisites: 'Foundational HTML/CSS and programming logic',
    trainerInfo: 'Principal Full-Stack Faculty',
    certificationDetails: 'Verifiable RESOLUTION Accredited Engineering Certificate',
    syllabus:
      'Module 1: TypeScript Deep Dive · Module 2: React State & Architecture · Module 3: Node & PostgreSQL · Module 4: Production Deployment',
    capacity: 45,
    placementAssistance: true,
  });

  // Save Coaching Center Profile
  const handleSaveCenter = async (e: React.FormEvent) => {
    e.preventDefault();
    const centerId = myCenter?.id || cleanId(`center_${currentUserUid.slice(0, 8)}_${Date.now()}`);
    const domains = cleanStringArray(
      centerForm.domainsInput.split(',').map((d) => d.trim()),
      20
    );

    try {
      await setDoc(
        doc(db, 'coachingCenters', centerId),
        {
          ownerId: cleanId(currentUserUid),
          centerName: cleanString(centerForm.centerName, 160),
          officialEmail: cleanString(centerForm.officialEmail, 254),
          contactNumber: cleanString(centerForm.contactNumber, 30),
          website: cleanString(centerForm.website, 300),
          description: cleanString(centerForm.description, 2000),
          country: cleanString(centerForm.country, 100),
          state: cleanString(centerForm.state, 100),
          city: cleanString(centerForm.city, 100),
          address: cleanString(centerForm.address, 400),
          trainingMode: centerForm.trainingMode,
          domains: domains.length > 0 ? domains : ['Technology'],
          trainerDetails: cleanString(centerForm.trainerDetails, 1000),
          accreditation: cleanString(centerForm.accreditation, 400),
          approvalStatus: myCenter?.approvalStatus || 'pending',
          createdAt: myCenter?.createdAt || serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
      setStatusBanner({
        type: 'success',
        message: 'Coaching center profile saved to Firestore.',
      });
      setActiveTab('dashboard');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `coachingCenters/${centerId}`);
    }
  };

  // Publish New Course
  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!myCenter) {
      setStatusBanner({ type: 'error', message: 'Please register your coaching center first.' });
      return;
    }

    const courseId = cleanId(`course_${Date.now()}`);
    const skills = cleanStringArray(
      courseForm.skillsTaughtInput.split(',').map((s) => s.trim()),
      30
    );

    try {
      await setDoc(doc(db, 'courses', courseId), {
        centerId: cleanId(myCenter.id),
        ownerId: cleanId(currentUserUid),
        centerName: cleanString(myCenter.centerName, 160),
        courseName: cleanString(courseForm.courseName, 160),
        category: cleanString(courseForm.category, 100),
        description: cleanString(courseForm.description, 2000),
        skillsTaught: skills.length > 0 ? skills : ['Software Development'],
        level: courseForm.level,
        duration: cleanString(courseForm.duration, 80),
        fees: Math.max(0, Number(courseForm.fees) || 0),
        currency: cleanString(courseForm.currency, 10),
        deliveryMode: courseForm.deliveryMode,
        startDate: cleanString(courseForm.startDate, 40),
        endDate: cleanString(courseForm.endDate, 40),
        schedule: cleanString(courseForm.schedule, 200),
        prerequisites: cleanString(courseForm.prerequisites, 400),
        trainerInfo: cleanString(courseForm.trainerInfo, 400),
        certificationDetails: cleanString(courseForm.certificationDetails, 400),
        syllabus: cleanString(courseForm.syllabus, 2000),
        capacity: Math.max(1, Number(courseForm.capacity) || 30),
        placementAssistance: Boolean(courseForm.placementAssistance),
        status: 'published',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setStatusBanner({
        type: 'success',
        message: `Published course "${courseForm.courseName}" under ${myCenter.centerName}.`,
      });
      setActiveTab('dashboard');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `courses/${courseId}`);
    }
  };

  // Update Learner Progress & Issue Completion Certificate
  const handleUpdateLearnerProgress = async (enr: CourseEnrollment, newPercent: number) => {
    const completed = newPercent >= 100;
    const certId = completed ? `CERT-RES-${enr.id.slice(-6).toUpperCase()}-2026` : enr.certificateId || '';
    try {
      await updateDoc(doc(db, 'enrollments', enr.id), {
        progressPercent: Math.min(100, Math.max(0, newPercent)),
        status: completed ? 'Completed' : 'In Progress',
        certificateIssued: completed,
        certificateId: cleanString(certId, 80),
        updatedAt: serverTimestamp(),
      });
      setStatusBanner({
        type: 'success',
        message: completed
          ? `Marked ${enr.studentName} as Completed and issued Certificate ${certId}!`
          : `Updated ${enr.studentName}'s progress to ${newPercent}%.`,
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `enrollments/${enr.id}`);
    }
  };

  const completedEnrollments = enrollments.filter((e) => e.status === 'Completed').length;
  const completionRate =
    enrollments.length > 0 ? Math.round((completedEnrollments / enrollments.length) * 100) : 0;

  return (
    <div className="max-w-[1360px] mx-auto px-6 py-8">
      {/* Header & Navigation */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <p className="text-xs font-semibold text-teal-700">PORTAL 03 · COACHING CENTER & SKILL DEVELOPMENT</p>
          <h1 className="text-2xl font-bold text-slate-900 mt-0.5">
            {myCenter?.centerName || 'Coaching Institute'} — Courses & Learner Outcomes
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            <span>Approval Status: {myCenter?.approvalStatus || 'approved'}</span>
            <span className="mx-1.5" aria-hidden="true">
              ·
            </span>
            <span>Mode: {myCenter?.trainingMode || 'Hybrid'}</span>
            <span className="mx-1.5" aria-hidden="true">
              ·
            </span>
            <span>{myCenter?.accreditation || 'Accredited Partner'}</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-200/70 rounded-lg">
          {[
            { id: 'dashboard', label: 'Center Dashboard' },
            { id: 'add-course', label: 'Publish Course' },
            { id: 'register', label: 'Institute Profile' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-700 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {statusBanner && (
        <div
          className={`mt-6 p-4 rounded-lg border flex items-center justify-between text-xs font-medium ${
            statusBanner.type === 'success'
              ? 'bg-teal-50 border-teal-200 text-teal-900'
              : 'bg-red-50 border-red-200 text-red-900'
          }`}
        >
          <span>{statusBanner.message}</span>
          <button onClick={() => setStatusBanner(null)} className="text-slate-500 hover:text-slate-800 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* TAB 1: COACHING CENTER DASHBOARD */}
      {activeTab === 'dashboard' && (
        <div className="mt-8 space-y-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="bg-white p-5 rounded-xl border border-slate-200">
              <p className="text-xs text-slate-500">Published Courses</p>
              <p className="text-2xl font-bold text-slate-900 font-mono-tabular mt-1">{courses.length}</p>
            </div>
            <div className="bg-white p-5 rounded-xl border border-slate-200">
              <p className="text-xs text-slate-500">Total Enrollments</p>
              <p className="text-2xl font-bold text-slate-900 font-mono-tabular mt-1">{enrollments.length}</p>
            </div>
            <div className="bg-white p-5 rounded-xl border border-slate-200">
              <p className="text-xs text-slate-500">Course Completion Rate</p>
              <p className="text-2xl font-bold text-teal-700 font-mono-tabular mt-1">{completionRate}%</p>
            </div>
            <div className="bg-white p-5 rounded-xl border border-slate-200">
              <p className="text-xs text-slate-500">Certificates Issued</p>
              <p className="text-2xl font-bold text-slate-900 font-mono-tabular mt-1">
                {enrollments.filter((e) => e.certificateIssued).length}
              </p>
            </div>
          </div>

          {/* Learner Progress & Certificate Issuance Table */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Active Learners, Completion Progress & Certificate Issuance
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Update learner progress or issue verified completion credentials
              </p>
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600">
                    <th className="py-2.5 px-3 font-semibold">Student Name</th>
                    <th className="py-2.5 px-3 font-semibold">Course</th>
                    <th className="py-2.5 px-3 font-semibold">Skills Taught</th>
                    <th className="py-2.5 px-3 font-semibold">Progress</th>
                    <th className="py-2.5 px-3 font-semibold">Certificate</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Update Progress</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {enrollments.map((enr) => (
                    <tr key={enr.id} className="hover:bg-slate-50/80">
                      <td className="py-2.5 px-3 font-bold text-slate-900">{enr.studentName}</td>
                      <td className="py-2.5 px-3 text-slate-700">{enr.courseName}</td>
                      <td className="py-2.5 px-3 text-slate-600">{enr.skillsTaught.join(' · ')}</td>
                      <td className="py-2.5 px-3 font-mono-tabular font-semibold text-slate-900">
                        {enr.progressPercent}% ({enr.status})
                      </td>
                      <td className="py-2.5 px-3 font-mono-tabular text-teal-700">
                        {enr.certificateIssued ? enr.certificateId || 'Issued' : 'Pending Completion'}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            onClick={() => handleUpdateLearnerProgress(enr, Math.min(100, enr.progressPercent + 25))}
                            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-md font-medium cursor-pointer"
                          >
                            +25%
                          </button>
                          <button
                            onClick={() => handleUpdateLearnerProgress(enr, 100)}
                            className="px-2.5 py-1 bg-teal-600 hover:bg-teal-500 text-white rounded-md font-semibold cursor-pointer"
                          >
                            Complete & Certify
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Published Courses & Employer Skill Alignment */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
            <h2 className="text-base font-bold text-slate-900">
              Published Course Catalog & Employer Skill-Gap Alignment
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {courses.map((course) => {
                const matchingJobsCount = jobs.filter((j) =>
                  j.requiredSkills.some((rk) =>
                    course.skillsTaught.some((ck) => ck.toLowerCase() === rk.toLowerCase())
                  )
                ).length;

                return (
                  <div key={course.id} className="p-5 rounded-xl border border-slate-200 space-y-2">
                    <p className="text-xs text-slate-500">
                      {course.category} · {course.level} · {course.deliveryMode} · {course.duration}
                    </p>
                    <h3 className="text-base font-bold text-slate-900">{course.courseName}</h3>
                    <p className="text-xs text-slate-600">{course.description}</p>
                    <p className="text-xs text-slate-700 pt-1">
                      <strong>Skills Taught:</strong> {course.skillsTaught.join(' · ')}
                    </p>
                    <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs">
                      <span className="font-mono-tabular font-bold text-slate-900">
                        {course.currency} {course.fees.toLocaleString()}
                      </span>
                      <span className="text-teal-700 font-medium">
                        Aligned with {matchingJobsCount} Active Job Listings
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: PUBLISH COURSE */}
      {activeTab === 'add-course' && (
        <div className="mt-8 bg-white rounded-xl border border-slate-200 p-6 sm:p-8 max-w-4xl">
          <h2 className="text-xl font-bold text-slate-900">Add & Publish Skill Development Course</h2>
          <form onSubmit={handleCreateCourse} className="mt-6 space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Course Name *</label>
                <input
                  type="text"
                  required
                  value={courseForm.courseName}
                  onChange={(e) => setCourseForm({ ...courseForm, courseName: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Course Category *</label>
                <select
                  value={courseForm.category}
                  onChange={(e) => setCourseForm({ ...courseForm, category: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                >
                  <option value="Web Development">Web Development</option>
                  <option value="Cloud Computing">Cloud Computing</option>
                  <option value="Data Science">Data Science & AI</option>
                  <option value="Cybersecurity">Cybersecurity</option>
                  <option value="Electronics & Engineering">Electronics & Engineering</option>
                  <option value="Communication Skills">Communication Skills</option>
                </select>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Skills Taught (Comma Separated) *</label>
                <input
                  type="text"
                  required
                  value={courseForm.skillsTaughtInput}
                  onChange={(e) => setCourseForm({ ...courseForm, skillsTaughtInput: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Proficiency Level</label>
                  <select
                    value={courseForm.level}
                    onChange={(e) => setCourseForm({ ...courseForm, level: e.target.value as Course['level'] })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="Beginner">Beginner</option>
                    <option value="Intermediate">Intermediate</option>
                    <option value="Advanced">Advanced</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Delivery Mode</label>
                  <select
                    value={courseForm.deliveryMode}
                    onChange={(e) =>
                      setCourseForm({ ...courseForm, deliveryMode: e.target.value as Course['deliveryMode'] })
                    }
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="Online">Online</option>
                    <option value="Offline">Offline</option>
                    <option value="Hybrid">Hybrid</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Duration *</label>
                  <input
                    type="text"
                    required
                    value={courseForm.duration}
                    onChange={(e) => setCourseForm({ ...courseForm, duration: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Course Fees (INR) *</label>
                  <input
                    type="number"
                    required
                    value={courseForm.fees}
                    onChange={(e) => setCourseForm({ ...courseForm, fees: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  />
                </div>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Schedule & Timings</label>
                <input
                  type="text"
                  value={courseForm.schedule}
                  onChange={(e) => setCourseForm({ ...courseForm, schedule: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Course Syllabus *</label>
              <textarea
                rows={2}
                required
                value={courseForm.syllabus}
                onChange={(e) => setCourseForm({ ...courseForm, syllabus: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Description *</label>
              <textarea
                rows={2}
                required
                value={courseForm.description}
                onChange={(e) => setCourseForm({ ...courseForm, description: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>

            <div className="flex justify-end pt-3">
              <button
                type="submit"
                className="px-6 py-2.5 bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold rounded-lg cursor-pointer"
              >
                Publish Course to Catalog
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 3: COACHING CENTER REGISTRATION */}
      {activeTab === 'register' && (
        <div className="mt-8 bg-white rounded-xl border border-slate-200 p-6 sm:p-8 max-w-4xl">
          <h2 className="text-xl font-bold text-slate-900">Coaching Center & Training Institute Registration</h2>
          <form onSubmit={handleSaveCenter} className="mt-6 space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Coaching Center Name *</label>
                <input
                  type="text"
                  required
                  value={centerForm.centerName}
                  onChange={(e) => setCenterForm({ ...centerForm, centerName: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Official Email *</label>
                <input
                  type="email"
                  required
                  value={centerForm.officialEmail}
                  onChange={(e) => setCenterForm({ ...centerForm, officialEmail: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Contact Number *</label>
                <input
                  type="text"
                  required
                  value={centerForm.contactNumber}
                  onChange={(e) => setCenterForm({ ...centerForm, contactNumber: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Training Domains (Comma Separated) *</label>
                <input
                  type="text"
                  required
                  value={centerForm.domainsInput}
                  onChange={(e) => setCenterForm({ ...centerForm, domainsInput: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">City *</label>
                <input
                  type="text"
                  required
                  value={centerForm.city}
                  onChange={(e) => setCenterForm({ ...centerForm, city: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Accreditation Details</label>
                <input
                  type="text"
                  value={centerForm.accreditation}
                  onChange={(e) => setCenterForm({ ...centerForm, accreditation: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
            </div>
            <div className="flex justify-end pt-3">
              <button
                type="submit"
                className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg cursor-pointer"
              >
                Save Institute Registration
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
