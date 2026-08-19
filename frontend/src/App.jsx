import { useState } from "react";
import axios from "axios";
import "./App.css";

function App() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [skills, setSkills] = useState("");
  const [jobRole, setJobRole] = useState("");
  const [experienceYears, setExperienceYears] = useState("");
  const [resume, setResume] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [candidate, setCandidate] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Please enter email and password.");
      return;
    }
    setError("");
    setLoggedIn(true);
  };

  const handleResumeChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.type !== "application/pdf") {
      setError("Please upload a PDF resume.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Resume must be smaller than 5 MB.");
      return;
    }
    setError("");
    setResume(file);
  };

  const handleMatchJobs = async (e) => {
    e.preventDefault();
    setError("");
    setJobs([]);
    setCandidate(null);

    if (!skills.trim() && !jobRole.trim() && !experienceYears && !resume) {
      setError(
        "Please provide skills, job role, experience, resume, or a combination."
      );
      return;
    }

    try {
      setLoading(true);
      const formData = new FormData();

      if (skills.trim()) {
        const skillArray = skills
          .split(",")
          .map((skill) => skill.trim())
          .filter(Boolean);

        formData.append(
          "skills",
          JSON.stringify(skillArray)
        );
      }

      if (jobRole.trim()) {
        const roleArray = jobRole
          .split(",")
          .map((role) => role.trim())
          .filter(Boolean);

        formData.append(
          "jobRoles",
          JSON.stringify(roleArray)
        );
      }

      if (experienceYears) {
        formData.append(
          "experienceYears",
          experienceYears
        );
      }

      if (resume) {
        formData.append("resume", resume);
      }

      const response = await axios.post(
        "http://localhost:5000/api/jobs/match",
        formData
      );
      const data = response.data;
      setCandidate(data.candidate || null);
      setJobs(data.jobs || []);
    } catch (error) {
      console.error("Matching error:", error);
      setError(error.response?.data?.message || error.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  if (!loggedIn) {
    return (
      <div className="login-page">
        <div className="login-card">

          <div className="brand">
            <div className="brand-icon">W</div>
            <span>Wexa JobMatch</span>
          </div>

          <h1>Welcome back</h1>

          <p className="login-subtitle">
            Find jobs that match your skills
            and experience.
          </p>

          <form onSubmit={handleLogin}>

            <label>Email</label>

            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) =>
                setEmail(e.target.value)
              }
            />

            <label>Password</label>

            <input
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) =>
                setPassword(e.target.value)
              }
            />

            {error && (
              <div className="error-message">
                {error}
              </div>
            )}

            <button type="submit">
              Sign In
            </button>
          </form>

          <p className="login-footer">
            AI-powered job matching
          </p>

        </div>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <header className="navbar">
        <div className="brand">
          <div className="brand-icon">W</div>
          <span>Wexa JobMatch</span>
        </div>
        <div className="user-section">
          <span>{email}</span>
          <button
            className="logout-button"
            onClick={() => {
              setLoggedIn(false);
              setJobs([]);
              setCandidate(null);
            }}
          >
            Logout
          </button>
        </div>
      </header>
      <main className="dashboard-content">
        <section className="hero-section">
          <p className="eyebrow">
            AI JOB MATCHING
          </p>
          <h1>
            Find jobs that match
            <br />
            your experience.
          </h1>
          <p className="hero-description">
            Enter your skills, job role,
            experience, upload your resume,
            or use any combination.
          </p>
        </section>
        <section className="matching-card">
          <div className="section-heading">
            <h2>Find Matching Jobs</h2>
            <p>
              Provide one or more inputs to
              find relevant opportunities.
            </p>
          </div>
          <form onSubmit={handleMatchJobs}>
            <div className="form-group">
              <label>Skills</label>
              <input
                type="text"
                placeholder="e.g. JavaScript, Node.js, RAG"
                value={skills}
                onChange={(e) =>
                  setSkills(e.target.value)
                }
              />
              <span className="input-help">
                Separate multiple skills with commas.
              </span>
            </div>
            <div className="form-group">
              <label>Job Role</label>
              <input
                type="text"
                placeholder="e.g. AI Engineer"
                value={jobRole}
                onChange={(e) =>
                  setJobRole(e.target.value)
                }
              />
            </div>
            <div className="form-group">
              <label>Experience</label>
              <div className="experience-input">
                <input
                  type="number"
                  min="0"
                  max="50"
                  step="0.5"
                  placeholder="e.g. 2"
                  value={experienceYears}
                  onChange={(e) =>
                    setExperienceYears(
                      e.target.value
                    )
                  }
                />
                <span>years</span>
              </div>
            </div>
            <div className="form-group">
              <label>Resume</label>
              <label className="upload-box">
                <input
                  type="file"
                  accept=".pdf,application/pdf"
                  onChange={handleResumeChange}
                />
                <div className="upload-icon">
                  ↑
                </div>
                <div>
                  {resume ? (
                    <>
                      <strong>
                        {resume.name}
                      </strong>

                      <span>
                        Resume selected
                      </span>
                    </>
                  ) : (
                    <>
                      <strong>
                        Upload your resume
                      </strong>

                      <span>
                        PDF files only · Max 5 MB
                      </span>
                    </>
                  )}
                </div>
              </label>
            </div>
            {error && (
              <div className="error-message">
                {error}
              </div>
            )}
            <button
              type="submit"
              className="match-button"
              disabled={loading}
            >
              {loading
                ? "Finding Matching Jobs..."
                : "Find Matching Jobs"}

              {!loading && (
                <span>→</span>
              )}
            </button>
          </form>
        </section>
        {candidate && (
          <section className="candidate-card">
            <div>
              <p className="eyebrow">
                YOUR PROFILE
              </p>
              <h2>
                Candidate Summary
              </h2>
            </div>
            <div className="candidate-info">
              {candidate.skills?.length > 0 && (
                <div className="candidate-item">
                  <span className="candidate-label">
                    Skills
                  </span>
                  <div className="candidate-skills">
                    {candidate.skills.map(
                      (skill, index) => (
                        <span
                          className="candidate-skill"
                          key={index}
                        >
                          {skill}
                        </span>
                      )
                    )}
                  </div>
                </div>
              )}
              <div className="candidate-item">
                <span className="candidate-label">
                  Experience
                </span>
                <strong>
                  {candidate.experience
                    ?.totalYears ?? 0}{" "}
                  years
                </strong>
              </div>
              {candidate.jobRoles?.length > 0 && (
                <div className="candidate-item">
                  <span className="candidate-label">
                    Target Role
                  </span>
                  <strong>
                    {candidate.jobRoles.join(", ")}
                  </strong>
                </div>
              )}
            </div>
          </section>
        )}
        {jobs.length > 0 && (
          <section className="results-section">
            <div className="results-header">
              <div>
                <p className="eyebrow">
                  RESULTS
                </p>
                <h2>
                  Matching Jobs
                </h2>
              </div>
              <span className="job-count">
                {jobs.length} jobs found
              </span>
            </div>
            <div className="jobs-list">
              {jobs.map((job, index) => {
                const matchPercentage =
                  job.finalScore ??
                  job.skillMatchPercentage ??
                  0;
                return (
                  <div
                    className="job-card"
                    key={index}
                  >
                    <div className="job-header">
                      <div>
                        <h3>
                          {job.jobTitle}
                        </h3>
                        <p className="company">
                          {job.company}
                        </p>
                      </div>
                      <div className="match-score">
                        <strong>
                          {matchPercentage}%
                        </strong>
                        <span>
                          Match
                        </span>
                      </div>
                    </div>
                    <div className="job-meta">
                      <span>
                        {" "}
                        {job.location ||
                          "Not specified"}
                      </span>
                      <span>
                        {" "}
                        {job.experience ||
                          "Not specified"}
                      </span>
                    </div>
                    <p className="job-description">
                      {job.description}
                    </p>
                    {job.matchedSkills?.length >
                      0 && (
                      <div className="skill-section">
                        <h4>
                          Matched Skills
                        </h4>
                        <div className="skills-row">
                          {job.matchedSkills.map(
                            (skill, skillIndex) => (
                              <span
                                className="skill-tag matched"
                                key={skillIndex}
                              >
                                {" "}
                                {typeof skill ===
                                "string"
                                  ? skill
                                  : skill.name}
                              </span>
                            )
                          )}
                        </div>
                      </div>
                    )}
                    {job.missingSkills?.length > 0 && (
                      <div className="skill-section">
                        <h4>
                          Missing Skills
                        </h4>
                        <div className="skills-row">
                          {job.missingSkills.map(
                            (skill, skillIndex) => (
                              <span
                                className="skill-tag missing"
                                key={skillIndex}
                              >
                                {skill}
                              </span>
                            )
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}
        {!loading &&
          candidate &&
          jobs.length === 0 && (
            <div className="no-results">
              <div className="no-results-icon">
                🔎
              </div>
              <h3>
                No matching jobs found
              </h3>
              <p>
                Try adding more skills,
                changing the job role, or
                uploading your resume.
              </p>
            </div>
          )}
      </main>
    </div>
  );
}

export default App;