import z from "zod";
import {
  StateGraph,
  START,
  END,
  StateSchema,
} from "@langchain/langgraph";

import { extractCandidateProfile } from "../services/ai.service.js";
import { findMatchingJobs } from "../services/db.service.js";

const CandidateProfileSchema = z.object({
  skills: z.array(z.string()).default([]),

  experience: z.object({
    totalYears: z.number().default(0),
    relevantYears: z.number().default(0),
  }),

  jobRoles: z.array(z.string()).default([]),

  education: z.array(z.string()).default([]),

  domains: z.array(z.string()).default([]),

  keywords: z.array(z.string()).default([]),

  experienceEvidence: z.array(z.string()).default([]),
});

const JobSchema = z.object({
}).passthrough();

export const state = new StateSchema({
  resumeText: z.string().nullable(),
  candidateProfile: CandidateProfileSchema.nullable(),
  jobs: z.array(JobSchema).default([]),
});

const extractProfileNode = async (state) => {
  const manualProfile = state?.candidateProfile || {
    skills: [],
    experience: {
      totalYears: 0,
      relevantYears: 0,
    },
    jobRoles: [],
    education: [],
    domains: [],
    keywords: [],
    experienceEvidence: [],
  };

  if (!state?.resumeText) {
    return {
      candidateProfile: manualProfile,
    };
  }

  const resumeProfile = await extractCandidateProfile(
    state?.resumeText
  );

  const mergedSkills = [
    ...(resumeProfile?.skills || []),
    ...(manualProfile?.skills || []),
  ];

  const uniqueSkills = [
    ...new Map(
      mergedSkills.map((skill) => [
        skill.toLowerCase().trim(),
        skill,
      ])
    ).values(),
  ];

  const candidateProfile = {
    skills: uniqueSkills,

    experience:
      manualProfile.experience?.totalYears > 0
        ? manualProfile?.experience
        : resumeProfile?.experience || {
            totalYears: 0,
            relevantYears: 0,
          },

    jobRoles: [
      ...new Set([
        ...(resumeProfile?.jobRoles || []),
        ...(manualProfile?.jobRoles || []),
      ]),
    ],

    education: [
      ...(resumeProfile?.education || []),
      ...(manualProfile?.education || []),
    ],

    domains: [
      ...new Set([
        ...(resumeProfile?.domains || []),
        ...(manualProfile?.domains || []),
      ]),
    ],

    keywords: [
      ...new Set([
        ...(resumeProfile?.keywords || []),
        ...(manualProfile?.keywords || []),
      ]),
    ],

    experienceEvidence: [
      ...(resumeProfile?.experienceEvidence || []),
      ...(manualProfile?.experienceEvidence || []),
    ],
  };

  return {
    candidateProfile,
  };
};

const findJobsNode = async (state) => {
  const jobs = await findMatchingJobs(
    state?.candidateProfile
  );

  return {
    jobs,
  };
};

export const graph = new StateGraph(state)
  .addNode("userProfile", extractProfileNode)
  .addNode("searchJobs", findJobsNode)
  .addEdge(START, "userProfile")
  .addEdge("userProfile", "searchJobs")
  .addEdge("searchJobs", END)
  .compile();
