# AI Job Search Filter Using CognoDB

An intelligent job search application built using **CognoDB Graph Database**, Node.js, and AI-powered resume parsing.

The application allows users to search for jobs using skills, job roles, domains, and keywords. If a resume is provided, the system extracts structured candidate information using OpenAI and combines it with the user's search inputs to find and rank relevant jobs.


****************************

# Use Case

Problem

Traditional job search systems generally depend on keyword matching.

For example, if a user searches:

Skills: JavaScript
Job Role: Software Engineer

1. Search Without Resume

When a resume is not provided, the candidate can enter their skills, job roles, domains, and keywords manually.

The system first retrieves jobs that are relevant to the provided search criteria. It then ranks the retrieved jobs based on factors such as:

Skills + Job Role + Domain + Keywords + Experience

For example:

Skills: JavaScript
Job Role: Software Engineer

2. Search With Resume

When a resume is uploaded, an LLM extracts a structured candidate profile containing:

Skills
Job roles
Domains
Keywords
Experience
Experience evidence
Education

The extracted information is combined with any manually entered search criteria.

The system then performs graph-based matching between the candidate profile and job requirements.






**************************************
# Why a Graph Database?

A graph database is well suited for this use case because a job is not an isolated record. A job is connected to many entities such as companies, skills, domains, keywords, and candidates.

A relational representation would require multiple tables and joins to establish these relationships. In a graph database, these relationships are represented directly as nodes and edges.


***************************************

# Run Instructions
1) Firstly cd wexa-cogno-assignment
2) Run npm i to install the packages
3) Run npm run dev to run the backend
4) cd frontend
5) Run npm i and npm run dev to run the frontend
6) This will run backend in PORT 5000 in http://localhost:5000/ mention in .env file and frontend in PORT in http://localhost:5173/
7) Put the .env file as below
```
COGNODB_URI=xyz
COGNODB_USERNAME=xyz
COGNODB_PASSWORD=xyz
OPENAI_API_KEY=xyz
PORT=5000
```
8) For congnoDB instances setup Firstly created account signup and then login and choose the free credits.
9) Then click on the New Instances button 
10) Select the free c0 instance.
11) Choose a region.
12) Wait for the instance to finish provisioning.
13) Save the credentials

---

# Main Queries
1. Job Seeding Query

The seeding query creates the job graph structure from the job dataset.

a) MERGE (company:Company...) creates a Company node if the company does not already exist.
b) SET company.description stores the company's description.
c) MERGE (job:Job...) creates a Job node using the job title and company.
d) SET stores job details such as location, experience, description, domains, keywords, education, and preferred skills.
e) MERGE (company)-[:POSTED]->(job) creates the relationship showing that the company posted the job.
f) WITH job passes the current job node to the next part of the query.
g) UNWIND $skills AS skillName converts the skills array into individual skill values.
h) MERGE (skill:Skill...) creates or reuses a Skill node for each skill.
i) MERGE (job)-[:REQUIRES]->(skill) connects each job to its required skills.
j) The JavaScript loop executes this parameterized query for every job, safely inserting all jobs into CognoDB.

2. Job Matching/Search Query

The matching query searches the graph using the candidate's skills, job roles, domains, keywords, and experience evidence.

a) MATCH (company)-[:POSTED]->(job) finds all jobs connected to companies through the POSTED relationship.
b) OPTIONAL MATCH (job)-[:REQUIRES]->(skill) retrieves the skills required by each job.
c) collect(DISTINCT skill.name) converts the individual skill nodes into a requiredSkills array.
d) matchedSearchSkills checks whether the candidate's skills match the job's required skills.
e) roleMatch checks whether the candidate's requested job role matches the job title.
f) matchedSearchDomains and matchedSearchKeywords check the candidate's domains and keywords against the job's stored requirements.
g) evidenceMatch checks whether resume experience evidence is relevant to the job description, keywords, or domains.
h) The WHERE clause is the actual retrieval filter: a job is returned only when at least one search criterion matches.
i) The query returns the matching job's company, title, description, requirements, and details needed for ranking.
h) JavaScript then calculates skill, role, domain, keyword, evidence, experience, and education scores and produces the final weighted match percentage.


# Data Model

The application uses three main node types:

1) Company — stores the company name and company description.
2) Job — represents an individual job posted by a company and stores the job title, location, experience, description, education, domains, keywords, and preferred skills.
3) Skill — represents a skill required by a job, such as Python, JavaScript, LangChain, or Docker.

# Relationships
Company ──[:POSTED]──> Job
Job ──[:REQUIRES]──> Skill

Company -[:POSTED]-> Job — connects a company to the jobs it has posted.
Job -[:REQUIRES]-> Skill — connects a job to the skills required for that position.
