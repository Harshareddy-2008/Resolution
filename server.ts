import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '15mb' }));

  // 1. AI-Powered PDF Resume Analyzer
  app.post('/api/ai/analyze-resume', async (req, res) => {
    try {
      const { pdfBase64, resumeText, targetRoles, careerStatus, availableCourses } = req.body;

      if (!pdfBase64 && !resumeText) {
        return res.status(400).json({ error: 'Please provide a PDF file or resume text to analyze.' });
      }

      const parts: any[] = [];
      if (pdfBase64) {
        parts.push({
          inlineData: {
            mimeType: 'application/pdf',
            data: pdfBase64,
          },
        });
      }

      const prompt = `You are the RESOLUTION AI Resume & Career Intelligence Engine.
Analyze the provided resume strictly based on its actual contents. Do NOT invent qualifications, certifications, or work experience that are not supported by the resume.

Candidate Context:
- Career Status: ${careerStatus || 'Job Seeker'}
- Target Job Roles: ${Array.isArray(targetRoles) && targetRoles.length > 0 ? targetRoles.join(', ') : 'Software Engineer, Data Analyst, Full-Stack Developer'}
- Available Platform Courses for Recommendations: ${JSON.stringify(availableCourses || [])}
${resumeText ? `\nResume Text Content:\n${resumeText}` : ''}

Extract and return a comprehensive JSON analysis with:
1. summary: A concise, factual 3-4 sentence professional resume summary.
2. technicalSkills: Array of objects { name, proficiency ('Explicitly Stated' | 'Inferred from Projects'), evidence } explaining how each skill was identified.
3. programmingLanguages: Array of programming languages explicitly found in the resume.
4. softwareAndTools: Array of software, frameworks, and tools found.
5. softSkills: Array of soft skills demonstrated or stated.
6. education: Array of educational qualifications found (degree, institution, year).
7. certifications: Array of certifications explicitly stated (empty array if none).
8. projects: Array of key projects mentioned.
9. internships: Array of internship experiences mentioned.
10. workExperience: Array of work experience roles mentioned.
11. yearsOfExperience: Numeric estimate of total years of professional experience (0 for students/fresh graduates).
12. suitableJobRoles: Array of 3-5 suitable job roles based on evidence.
13. missingSkillsForTargetRoles: Array of specific skills missing for the candidate's preferred job roles.
14. readinessScore: Integer 0-100 assessing current job readiness for target roles.
15. readinessLimitations: Clear explanation of the assessment methodology and its limitations (e.g. based solely on written resume artifacts, does not measure live coding or interpersonal performance).
16. courseRecommendations: Array of 2-4 recommended courses { courseName, provider, reason, targetSkillGap } matching available platform courses or critical skill gaps.
17. resumeImprovements: Array of 3-5 actionable recommendations to improve the resume.`;

      parts.push({ text: prompt });

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: { parts },
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              summary: { type: Type.STRING },
              technicalSkills: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING },
                    proficiency: { type: Type.STRING },
                    evidence: { type: Type.STRING },
                  },
                  required: ['name', 'proficiency', 'evidence'],
                },
              },
              programmingLanguages: { type: Type.ARRAY, items: { type: Type.STRING } },
              softwareAndTools: { type: Type.ARRAY, items: { type: Type.STRING } },
              softSkills: { type: Type.ARRAY, items: { type: Type.STRING } },
              education: { type: Type.ARRAY, items: { type: Type.STRING } },
              certifications: { type: Type.ARRAY, items: { type: Type.STRING } },
              projects: { type: Type.ARRAY, items: { type: Type.STRING } },
              internships: { type: Type.ARRAY, items: { type: Type.STRING } },
              workExperience: { type: Type.ARRAY, items: { type: Type.STRING } },
              yearsOfExperience: { type: Type.NUMBER },
              suitableJobRoles: { type: Type.ARRAY, items: { type: Type.STRING } },
              missingSkillsForTargetRoles: { type: Type.ARRAY, items: { type: Type.STRING } },
              readinessScore: { type: Type.NUMBER },
              readinessLimitations: { type: Type.STRING },
              courseRecommendations: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    courseName: { type: Type.STRING },
                    provider: { type: Type.STRING },
                    reason: { type: Type.STRING },
                    targetSkillGap: { type: Type.STRING },
                  },
                  required: ['courseName', 'provider', 'reason', 'targetSkillGap'],
                },
              },
              resumeImprovements: { type: Type.ARRAY, items: { type: Type.STRING } },
            },
            required: [
              'summary',
              'technicalSkills',
              'programmingLanguages',
              'softwareAndTools',
              'softSkills',
              'education',
              'certifications',
              'projects',
              'internships',
              'workExperience',
              'yearsOfExperience',
              'suitableJobRoles',
              'missingSkillsForTargetRoles',
              'readinessScore',
              'readinessLimitations',
              'courseRecommendations',
              'resumeImprovements',
            ],
          },
        },
      });

      const parsed = JSON.parse(response.text || '{}');
      res.json(parsed);
    } catch (error: any) {
      console.error('AI Resume Analysis Error:', error);
      res.status(500).json({ error: error.message || 'Failed to analyze resume with Gemini AI.' });
    }
  });

  // 2. AI Candidate-to-Job Matching Engine
  app.post('/api/ai/match-candidate', async (req, res) => {
    try {
      const { candidateProfile, jobListing } = req.body;
      if (!candidateProfile || !jobListing) {
        return res.status(400).json({ error: 'Candidate profile and job listing are required.' });
      }

      const prompt = `You are the RESOLUTION Fair Recruitment Matching Engine.
Compare this candidate's verified profile and extracted skills against the job requirements.
CRITICAL FAIRNESS RULE: Do NOT use protected characteristics such as gender, age, or date of birth to rank or evaluate applicants. This score is an advisory input to support human decision-making, never an automated rejection.

Candidate Profile:
- Qualification: ${candidateProfile.highestQualification || 'Not specified'} (${candidateProfile.fieldOfStudy || ''})
- Skills: ${(candidateProfile.skills || []).join(', ')}
- Experience: ${candidateProfile.yearsOfExperience || 0} years
- Location: ${candidateProfile.city || ''}, ${candidateProfile.country || ''}

Job Listing:
- Title: ${jobListing.title} at ${jobListing.companyName}
- Required Skills: ${(jobListing.requiredSkills || []).join(', ')}
- Preferred Skills: ${(jobListing.preferredSkills || []).join(', ')}
- Required Education: ${jobListing.educationalQualifications || 'Any'}
- Required Experience: ${jobListing.requiredExperience || '0+ years'}
- Location & Work Mode: ${jobListing.location} (${jobListing.workMode})

Return a JSON object with:
- matchScore: number (0-100)
- matchingSkills: array of matching skills
- missingSkills: array of missing required or preferred skills
- educationMatch: string explanation
- locationCompatibility: string explanation
- explanation: 2-3 sentence transparent explanation of how the match score was computed for human recruiter review.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              matchScore: { type: Type.NUMBER },
              matchingSkills: { type: Type.ARRAY, items: { type: Type.STRING } },
              missingSkills: { type: Type.ARRAY, items: { type: Type.STRING } },
              educationMatch: { type: Type.STRING },
              locationCompatibility: { type: Type.STRING },
              explanation: { type: Type.STRING },
            },
            required: ['matchScore', 'matchingSkills', 'missingSkills', 'educationMatch', 'locationCompatibility', 'explanation'],
          },
        },
      });

      res.json(JSON.parse(response.text || '{}'));
    } catch (error: any) {
      console.error('AI Candidate Match Error:', error);
      res.status(500).json({ error: error.message || 'Failed to compute AI candidate match.' });
    }
  });

  // 3. AI In-Demand Skills, Course & Retention Insights Engine
  app.post('/api/ai/market-insights', async (req, res) => {
    try {
      const { jobsSummary, coursesSummary, placementsCount, retentionSummary } = req.body;

      const prompt = `You are the RESOLUTION Labor Market & Retention Analytics Engine.
Analyze the following real platform dataset and generate grounded executive insights.
Do NOT invent statistics or claim causal relationships where only observational correlations exist.

Platform Data Snapshot:
- Active Jobs Sample: ${JSON.stringify(jobsSummary || [])}
- Courses Sample: ${JSON.stringify(coursesSummary || [])}
- Total Placements: ${placementsCount || 0}
- Retention Summary: ${JSON.stringify(retentionSummary || {})}

Return a JSON object containing:
- executiveSummary: 2-3 sentences summarizing current skill demand, salary associations, and retention patterns.
- emergingSkills: Array of 4-6 high-demand skills observed in active listings.
- commonSkillGaps: Array of 3-5 skills frequently required by employers that candidates should prioritize.
- methodologyNote: Clear statement of sample size, observation period, and analytical limitations (associative trends, not causal proof).`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              executiveSummary: { type: Type.STRING },
              emergingSkills: { type: Type.ARRAY, items: { type: Type.STRING } },
              commonSkillGaps: { type: Type.ARRAY, items: { type: Type.STRING } },
              methodologyNote: { type: Type.STRING },
            },
            required: ['executiveSummary', 'emergingSkills', 'commonSkillGaps', 'methodologyNote'],
          },
        },
      });

      res.json(JSON.parse(response.text || '{}'));
    } catch (error: any) {
      console.error('AI Market Insights Error:', error);
      res.status(500).json({ error: error.message || 'Failed to generate market insights.' });
    }
  });

  // 4. Automated Email & Retention Check-In Dispatcher (90 / 180 / 365 Days)
  app.post('/api/retention/generate-email', (req, res) => {
    const { firstName, checkpointDays, companyName, designation, checkInId } = req.body;
    const days = Number(checkpointDays) || 90;
    const appUrl = process.env.APP_URL || 'https://resolution.platform';

    const subject =
      days === 365
        ? `RESOLUTION — Your 1-Year (365-Day) Career & Retention Check-In`
        : `RESOLUTION — Your ${days}-Day Career Check-In`;

    const body = `Hello ${firstName || 'Candidate'},

We hope your career journey as ${designation || 'a team member'} at ${companyName || 'your organization'} is progressing well. As part of RESOLUTION's ${days}-day employment follow-up program, we would like to know your current employment status.

Please securely update your status using your authenticated portal check-in link below (Check-In Reference: ${checkInId || 'RET-CHECKIN'}):
${appUrl}/?portal=user&checkin=${checkInId || ''}

Through your secure portal check-in, you can:
- Confirm you are still employed with ${companyName || 'your original employer'}
- Confirm you are employed at a different company
- Report if you are currently unemployed and request immediate placement & upskilling assistance from RESOLUTION
- Optionally update your current role and compensation package

Your response helps us understand verified employment outcomes and improve our job and learning recommendations.

Thank you for being part of RESOLUTION.`;

    res.json({
      subject,
      bodyPreview: body,
      sentAt: new Date().toISOString().split('T')[0],
      deliveryStatus: 'Delivered',
    });
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*all', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`RESOLUTION full-stack server running on http://localhost:${PORT}`);
  });
}

startServer();
