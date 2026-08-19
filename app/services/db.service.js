import driver from "../config/db.js";
import jobs from "../data/jobs.js";
import { calculateBestJobPercentage } from "../controllers/job.controller.js";

const verifyDatabaseConnection = async () => {
    const session = driver.session();
    try {
        const query = `RETURN "CognoDB connection successful" AS message`;
        const result = await session.run(query);
        return result.records[0].get("message");
    } catch(error) {
        console.error("CognoDB connection failed:", error.message);
    } finally {
        await session.close();
    }
};

const clearDatabase = async () => {
    const session = driver.session();
    try {
        const query = `
      MATCH (n)
      DETACH DELETE n
    `;
        await session.run(query);
        console.log("Database cleared.");
    } finally {
        await session.close();
    }
};

const seedJobs = async (jobs) => {
    const session = driver.session();

    try {
        const query = `
        MERGE (company:Company {
          name: $company
        })

        SET company.description =
          $companyDescription


        MERGE (job:Job {
          title: $jobTitle,
          company: $company
        })

        SET
          job.location = $location,
          job.experience = $experience,
          job.description = $description,

          job.preferredSkills =
            $preferredSkills,

          job.education =
            $education,

          job.domains =
            $domains,

          job.keywords =
            $keywords


        MERGE (company)-[:POSTED]->(job)


        WITH job

        UNWIND $skills AS skillName

        MERGE (skill:Skill {
          name: skillName
        })

        MERGE (job)-[:REQUIRES]->(skill)
        `;

        for (const job of jobs) {
            await session.run(
                query,
                {
                    company: job.company,
                    companyDescription: job.companyDescription,
                    jobTitle: job.jobTitle,
                    location: job.location,
                    experience: job.experience,
                    description: job.description,
                    skills: job.skills || [],
                    preferredSkills: job.preferredSkills || [],
                    education: job.education || [],
                    domains: job.domains || [],
                    keywords: job.keywords || [],
                }
            );
        }
        console.log(
            `${jobs.length} jobs seeded successfully.`
        );
    } finally {
        await session.close();
    }
};

export const seedDatabase = async () => {
    try {
        const message = await verifyDatabaseConnection();
        console.log(message);
        await clearDatabase();
        await seedJobs(jobs);
        console.log("Database seeding completed.");
    } catch (error) {
        console.error("Database seeding error:");
        console.error(error.message);
    }
};

export const findMatchingJobs = async (candidateProfile) => {
    const session = driver.session();
    try {
        const candidateSkills = candidateProfile.skills || [].map(normalizeSkill).filter(Boolean);
        const candidateJobRoles = candidateProfile.jobRoles || [].map(normalize).filter(Boolean);
        const candidateDomains = candidateProfile.domains || [].map(normalize).filter(Boolean);
        const candidateKeywords = candidateProfile.keywords || [].map(normalize).filter(Boolean);
        const candidateEvidence = candidateProfile.experienceEvidence || [].map((item) =>
          typeof item === "string" ? item : JSON.stringify(item)
        ).map(normalize).filter(Boolean);
        const hasResumeContext = candidateDomains.length > 0 || candidateKeywords.length > 0 || candidateEvidence.length > 0;

        const query = `
            MATCH
                (company:Company)-[:POSTED]->(job:Job)

            OPTIONAL MATCH
                (job)-[:REQUIRES]->(skill:Skill)

            WITH
                company,
                job,
                collect(DISTINCT skill.name) AS requiredSkills

            WITH
                company,
                job,
                requiredSkills,

                [skill IN requiredSkills
                    WHERE any(candidateSkill IN $candidateSkills
                        WHERE
                            toLower(replace(skill, ".", "")) =
                            toLower(replace(candidateSkill, ".", ""))
                    )
                ] AS matchedSearchSkills

            WITH
                company,
                job,
                requiredSkills,
                matchedSearchSkills,

                any(role IN $candidateJobRoles
                    WHERE
                        toLower(job.title) CONTAINS role
                        OR
                        role CONTAINS toLower(job.title)
                ) AS roleMatch,

                [
                    domain IN coalesce(job.domains, [])
                    WHERE any(candidateDomain IN $candidateDomains
                        WHERE toLower(domain) = candidateDomain
                    )
                ] AS matchedSearchDomains,

                [
                    keyword IN coalesce(job.keywords, [])
                    WHERE any(candidateKeyword IN $candidateKeywords
                        WHERE
                            toLower(keyword) = candidateKeyword
                            OR
                            toLower(job.description) CONTAINS candidateKeyword
                    )
                ] AS matchedSearchKeywords

            WITH
                company,
                job,
                requiredSkills,
                matchedSearchSkills,
                roleMatch,
                matchedSearchDomains,
                matchedSearchKeywords,

                any(evidence IN $candidateEvidence
                    WHERE
                        toLower(job.description) CONTAINS evidence
                        OR
                        any(keyword IN coalesce(job.keywords, [])
                            WHERE toLower(evidence) CONTAINS toLower(keyword))
                        OR
                        any(domain IN coalesce(job.domains, [])
                            WHERE toLower(evidence) CONTAINS toLower(domain))
                ) AS evidenceMatch

            WHERE
                size(matchedSearchSkills) > 0
                OR roleMatch
                OR size(matchedSearchDomains) > 0
                OR size(matchedSearchKeywords) > 0
                OR evidenceMatch

            RETURN
                company.name AS company,
                company.description AS companyDescription,
                job.title AS jobTitle,
                job.location AS location,
                job.experience AS experience,
                job.description AS description,
                job.education AS requiredEducation,
                job.domains AS requiredDomains,
                job.keywords AS requiredKeywords,
                requiredSkills,

                matchedSearchSkills,
                roleMatch,
                matchedSearchDomains,
                matchedSearchKeywords,
                evidenceMatch
        `;

        const result = await session.run(query, {
          candidateSkills,
          candidateJobRoles,
          candidateDomains: hasResumeContext ? candidateDomains : [],
          candidateKeywords: hasResumeContext ? candidateKeywords : [],
          candidateEvidence: hasResumeContext ? candidateEvidence : [],
        });

        const matchingJobs = [];

        for (const record of result.records) {
            const requiredSkills = record.get("requiredSkills") || [];
            const requiredDomains = record.get("requiredDomains") || [];

            const requiredKeywords = record.get("requiredKeywords") || [];

            const requiredEducation = record.get("requiredEducation") || [];

            const jobTitle = record.get("jobTitle") || "";

            const description = record.get("description") || "";

            const matchedSkills = requiredSkills.filter((skill) =>
              candidateSkills.some((candidateSkill) =>
                normalizeSkill(candidateSkill) === normalizeSkill(skill)
              )
            );

            const missingSkills = requiredSkills.filter((skill) =>
              !matchedSkills.some((matched) =>
                normalizeSkill(matched) === normalizeSkill(skill)
              )
            );

            const skillScore = requiredSkills.length > 0
            ? Math.round((matchedSkills.length / requiredSkills.length) * 100)
            : 0;

            const normalizedJobTitle = normalize(jobTitle);

            const roleMatch = candidateJobRoles.some((role) =>
              normalizedJobTitle.includes(role) ||
              role.includes(normalizedJobTitle)
            );

            const roleScore = candidateJobRoles.length > 0
            ? roleMatch
            ? 100 : 0
            : null;

            const matchedDomains = requiredDomains.filter((domain) =>
              candidateDomains.includes(normalize(domain))
            );

            const domainScore = candidateDomains.length > 0 && requiredDomains.length > 0
            ? Math.round((matchedDomains.length / requiredDomains.length) * 100)
            : null;

            const normalizedDescription = normalize(description);

            const matchedKeywords = requiredKeywords.filter((keyword) => {
              const normalizedKeyword = normalize(keyword);
              return (
                candidateKeywords.includes(normalizedKeyword) || normalizedDescription.includes(normalizedKeyword)
              );
            });

            const keywordScore = candidateKeywords.length > 0 && requiredKeywords.length > 0
            ? Math.round((matchedKeywords.length / requiredKeywords.length) * 100)
            : null;

            const candidateYears = Number(candidateProfile.experience?.totalYears || 0);

            const experienceScore = candidateYears > 0
            ? calculateExperienceScore(candidateYears, record.get("experience"))
            : null;
            let evidenceScore = null;

            if (candidateEvidence.length > 0) {
                const jobText = normalize([
                    description,
                    ...requiredKeywords,
                    ...requiredDomains,
                    ...requiredSkills,
                  ].join(" ")
                );

                let matchedEvidence = 0;

                for (const evidence of candidateEvidence) {
                    const words = normalize(evidence).split(/[^a-z0-9+#.]+/).filter((word) =>
                      word.length > 2
                    );

                    const matched = words.some((word) =>
                      jobText.includes(word)
                    );

                    if (matched) {
                      matchedEvidence++;
                    }
                }

                evidenceScore = Math.round((matchedEvidence / candidateEvidence.length) * 100);
            }

            let educationScore = null;
            if (candidateProfile.education?.length > 0 && requiredEducation?.length > 0) {
                const educationText = candidateProfile.education.map((education) =>
                  typeof education === "string"
                  ? education
                  : `${education.degree || ""} ${education.field || ""}`
                ).map(normalize)
                .join(" ");

                const matchedEducation = requiredEducation.filter((education) =>
                  educationText.includes(normalize(education))
                );

                educationScore = Math.round((matchedEducation.length /requiredEducation.length) * 100);
            }

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
                    weight: 15,
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

            const totalWeight = factors.reduce((sum, factor) =>
              sum + factor.weight,
              0
            );

            const finalScore = totalWeight > 0
            ? Math.round(factors.reduce((sum, factor) =>
                sum + factor.score * factor.weight,
                0
              ) / totalWeight
              )
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
    } finally {
        await session.close();
    }
};

const normalize = (value) => String(value || "").toLowerCase().trim();

const normalizeSkill = (value) => normalize(value).replace(/\./g, "").replace(/[-_]/g, "").replace(/\s+/g, "");

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

    return Math.round((candidateYears / requiredYears) * 100);
};
