import fs from "fs/promises";
import { graph } from "../graph/graph.js";
import { extractTextFromPdf } from "../services/pdf.service.js";

export const matchJobs = async (req, res) => {
    let resumeText = null;
    const skillData = req.body?.skills;
    const experienceData = req.body?.experienceYears;
    const jobRolesData = req.body?.jobRoles;
    try {
        let skills = [];
        if (skillData) {
            if (typeof skillData === "string") {
                try {
                    skills = JSON.parse(skillData);
                } catch {
                    skills = skillData.split(",").map((skill) => skill.trim()).filter(Boolean);
                }
            } else if (
                Array.isArray(skillData)
            ) {
                skills = skillData;
            }
        }
        let experience = {
            totalYears: 0,
            relevantYears: 0,
        };

        if (experienceData) {
            experience.totalYears = Number(experienceData);
        }

        let jobRoles = [];

        if (jobRolesData) {
            if (typeof jobRolesData === "string") {
                try {
                    jobRoles = JSON.parse(jobRolesData);
                } catch {
                    jobRoles = jobRolesData.split(",").map((role) => role.trim()).filter(Boolean);
                }
            } else if (Array.isArray(jobRolesData)) {
                jobRoles = jobRolesData;
            }
        }

        const manualProfile = {
            skills,
            experience,
            jobRoles,
            education: [],
            domains: [],
            keywords: [],
            experienceEvidence: [],
        };

        if (req?.file) {
            resumeText = await extractTextFromPdf(req.file.path);
            console.log(resumeText, 'resumeText');
        }

        if (skills?.length === 0 && !resumeText) {
            return res.status(400).json({
                success: false,
                message: "Provide skills, resume, or both.",
            });
        }

        const result = await graph.invoke({
            resumeText,
            candidateProfile: manualProfile,
        });

        if (req.file) {
            await fs.unlink(req.file.path);
        }

        res.json({
            success: true,
            candidate: result.candidateProfile,
            totalJobs: result.jobs.length,
            jobs: result.jobs,
        });
    } catch (error) {
        console.error("Job matching error:", error);

        if (req.file?.path) {
            await fs.unlink(req.file.path);
        }
        res.status(500).json({
            success: false,
            message: "Failed to match jobs",
            error: error.message,
        });
    }
};

export async function calculateBestJobPercentage(result, candidateProfile) {
    const candidateSkills = (candidateProfile.skills || []).map(normalize).filter(Boolean);
    const candidateJobRoles = (candidateProfile.jobRoles || []).map(normalize).filter(Boolean);
    const candidateDomains = (candidateProfile.domains || []).map(normalize).filter(Boolean);
    const candidateKeywords = (candidateProfile.keywords || []).map(normalize).filter(Boolean);

    const candidateEvidence = (candidateProfile.experienceEvidence || []).map((item) => typeof item === "string" ? item : JSON.stringify(item))
        .map(normalize)
        .filter(Boolean);
    const candidateYears = Number(candidateProfile.experience?.totalYears || candidateProfile.experienceYears || 0);
    const candidateEducation = candidateProfile.education || [];

    const matchingJobs = [];
    for (const record of result.records) {
        const jobTitle = record.get("jobTitle") || "";
        const description = record.get("description") || "";
        const requiredSkills = record.get("requiredSkills") || [];
        const requiredDomains = record.get("requiredDomains") || [];
        const requiredKeywords = record.get("requiredKeywords") || [];
        const requiredEducation = record.get("requiredEducation") || [];

        const matchedSkills = requiredSkills.filter(
            (skill) => candidateSkills.includes(normalize(skill))
        );

        const missingSkills = requiredSkills.filter(
            (skill) => !candidateSkills.includes(normalize(skill))
        );

        const skillScore = requiredSkills.length > 0 ? Math.round((matchedSkills.length / requiredSkills.length) * 100) : null;

        const normalizedJobTitle = normalize(jobTitle);
        const roleMatch = candidateJobRoles.length > 0 && candidateJobRoles.some(
            (role) => normalizedJobTitle.includes(role) || role.includes(normalizedJobTitle)
        );
        const roleScore = candidateJobRoles.length > 0 ? roleMatch ? 100 : 0 : null;

        const normalizedRequiredDomains = requiredDomains.map(normalize);
        const matchedDomains = candidateDomains.filter(
            (domain) => normalizedRequiredDomains.includes(domain)
        );

        const domainScore = candidateDomains.length > 0 && requiredDomains.length > 0 ? Math.round((matchedDomains.length / requiredDomains.length) * 100) : null;

        const normalizedRequiredKeywords = requiredKeywords.map(normalize);
        const normalizedDescription = normalize(description);

        const matchedKeywords = candidateKeywords.filter(
            (keyword) => {
                return (
                    normalizedRequiredKeywords.includes(keyword) ||
                    normalizedDescription.includes(keyword)
                );
            }
        );

        const keywordScore = candidateKeywords.length > 0 ? requiredKeywords.length > 0 ?
            Math.min(
                100,
                Math.round((matchedKeywords.length / requiredKeywords.length) * 100)
            ) : 0 : null;

        const jobContext = [
            description,
            ...requiredKeywords,
            ...requiredDomains,
            ...requiredSkills,
        ]
            .map(normalize)
            .join(" ");

        let matchedEvidence = 0;
        for (const evidence of candidateEvidence) {
            const evidenceWords = normalize(evidence).split(/[^a-z0-9+#.]+/).filter((word) => word.length > 2);
            const evidenceMatched = evidenceWords.some((word) => jobContext.includes(word));
            if (evidenceMatched) {
                matchedEvidence++;
            }
        }

        const evidenceScore = candidateEvidence.length > 0 ? Math.round((matchedEvidence / candidateEvidence.length) * 100) : null;

        const experienceScore = candidateYears > 0 ? calculateExperienceScore(
            candidateYears,
            record.get("experience")
        )
            : null;

        let educationScore = null;
        if (candidateEducation.length > 0 && requiredEducation.length > 0) {
            const educationText = candidateEducation.map((education) => typeof education === "string" ? education : `${education.degree || ""} ${education.field || ""}`)
                .map(normalize)
                .join(" ");

            const educationMatches = requiredEducation.filter((education) => educationText.includes(normalize(education)));

            educationScore = Math.round((educationMatches.length / requiredEducation.length) * 100);
        }

        const hasSearchMatch = matchedSkills.length > 0 || roleMatch;
        const factors = [];

        if (skillScore !== null) {
            factors.push({
                score: skillScore,
                weight: 40,
            });
        }

        if (keywordScore !== null) {
            factors.push({
                score: keywordScore,
                weight: 10,
            });
        }

        if (evidenceScore !== null) {
            factors.push({
                score: evidenceScore,
                weight: 20,
            });
        }

        if (domainScore !== null) {
            factors.push({
                score: domainScore,
                weight: 10,
            });
        }

        if (roleScore !== null) {
            factors.push({
                score: roleScore,
                weight: 10,
            });
        }

        if (experienceScore !== null) {
            factors.push({
                score: experienceScore,
                weight: 5,
            });
        }

        if (educationScore !== null) {
            factors.push({
                score: educationScore,
                weight: 5,
            });
        }

        const totalWeight = factors.reduce((sum, factor) => sum + factor.weight, 0);
        const finalScore = totalWeight > 0
            ? Math.round(factors.reduce((sum, factor) => sum + factor.score * (factor.weight / totalWeight), 0))
            : 0;

        matchingJobs.push({
            company: record.get("company"),
            companyDescription: record.get("companyDescription"),
            jobTitle,
            location: record.get("location"),
            experience: record.get("experience"),
            description,
            requiredSkills,
            matchedSkills,
            missingSkills,
            finalScore,
        });
    }
    matchingJobs.sort((a, b) => b.finalScore - a.finalScore);
    return matchingJobs;
}

const normalize = (value) => String(value || "").toLowerCase().trim();

const calculateExperienceScore = (candidateYears = 0, requiredExperience = "") => {
    const match = String(requiredExperience || "").match(/(\d+(?:\.\d+)?)/);
    if (!match) {
        return null;
    }
    const requiredYears = Number(match[1]);
    if (requiredYears <= 0) {
        return 100;
    }
    if (candidateYears >= requiredYears) {
        return 100;
    }
    if (candidateYears <= 0) {
        return 0;
    }
    return Math.round(
        (candidateYears / requiredYears) * 100
    );
};
