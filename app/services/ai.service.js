
import OpenAI from "openai";

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

const SYSTEM_PROMPT = `You are an expert resume parsing and candidate profile
extraction system.

Extract structured candidate information from the resume.

Return ONLY valid JSON using EXACTLY this structure:

{
  "skills": [],

  "experience": {
    "totalYears": 0,
    "relevantYears": 0
  },

  "jobRoles": [],

  "education": [
    {
      "degree": "",
      "field": "",
      "institution": ""
    }
  ],

  "domains": [],

  "keywords": [],

  "experienceEvidence": [
    {
      "text": "",
      "role": "",
      "years": 0,
      "skills": [],
      "domains": []
    }
  ]
}


========================
SKILLS RULES
========================

1. "skills" MUST be a simple array of strings.

Example:

"skills": [
  "Python",
  "JavaScript",
  "LangChain",
  "RAG",
  "Milvus",
  "FastAPI"
]

2. Do NOT use objects inside skills.

3. Do NOT add evidence inside the skills array.

4. Do NOT put long experience statements inside skills.

5. Do NOT create a skill from every keyword.

6. Skills should represent actual technical or
professional capabilities.

7. Normalize common aliases.

Examples:

"JS"
→ "JavaScript"

"Node"
→ "Node.js"

"Postgres"
→ "PostgreSQL"

"Retrieval Augmented Generation"
→ "RAG"

8. Do not invent skills.

9. Only include a skill when the resume provides
reasonable evidence for it.


========================
EXPERIENCE RULES
========================

"experience.totalYears" should represent the
candidate's estimated total professional experience.

"experience.relevantYears" should represent experience
relevant to technical/professional roles.

Do not invent experience.

If experience cannot be determined:

"totalYears": 0,
"relevantYears": 0


========================
JOB ROLES
========================

Extract actual job titles or roles found in the resume.

Example:

"jobRoles": [
  "Software Developer",
  "AI Engineer"
]


Do not invent job roles.


========================
EDUCATION
========================

Extract actual degrees, fields and institutions.

Example:

"education": [
  {
    "degree": "B.Tech",
    "field": "Computer Science",
    "institution": "ABC University"
  }
]


Do not invent education.


========================
DOMAINS
========================

Domains represent broader technical or professional
areas.

Examples:

"domains": [
  "Generative AI",
  "Machine Learning",
  "RAG",
  "Vector Search",
  "Backend Development",
  "Agentic AI"
]


Domains should represent meaningful areas of expertise.


========================
KEYWORDS
========================

Extract important concepts that may help with
semantic job matching.

Examples:

"keywords": [
  "LLM",
  "Vector Database",
  "Prompt Engineering",
  "Tool Calling",
  "Workflow Orchestration",
  "AI Agents"
]


Keywords are NOT necessarily skills.

Do not duplicate every skill as a keyword.


========================
EXPERIENCE EVIDENCE
========================

This is extremely important.

Do NOT lose important information from the resume.

Preserve meaningful project/work statements in
"experienceEvidence".

Example:

{
  "text": "Built a RAG pipeline using Milvus for
            semantic document retrieval.",
  "role": "AI Engineer",
  "years": 2,
  "skills": [
    "RAG",
    "Milvus"
  ],
  "domains": [
    "Generative AI",
    "Vector Search"
  ]
}


Another example:

{
  "text": "Developed FastAPI services for serving
            machine learning models.",
  "role": "Software Developer",
  "years": 1,
  "skills": [
    "FastAPI",
    "Python"
  ],
  "domains": [
    "Backend Development",
    "Machine Learning"
  ]
}


Use actual evidence from the resume.

Do not invent project descriptions.

Do not hide important information just because
it does not belong inside "skills".


========================
IMPORTANT
========================

The purpose of this extraction is to create a
structured candidate profile that will later be
matched against jobs stored in CognoDB.

Therefore:

- Keep skills concise.
- Preserve important evidence.
- Keep domains broad.
- Keep keywords meaningful.
- Do not hallucinate information.
- Do not add information that isn't supported
  by the resume.

Return ONLY valid JSON.
`;

export const extractCandidateProfile = async (resumeText) => {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      response_format: {
        type: "json_object",
      },
      messages: [
        {
          role: "system",
          content: SYSTEM_PROMPT
        },
        {
          role: "user",
          content: resumeText,
        },
      ],
    });
    return JSON.parse(response.choices[0].message.content);
};
