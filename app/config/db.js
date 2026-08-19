import neo4j from "neo4j-driver";

const requiredEnvVariables = [
  "COGNODB_URI",
  "COGNODB_USERNAME",
  "COGNODB_PASSWORD",
];

for (const variable of requiredEnvVariables) {
  if (!process.env[variable]) {
    throw new Error(`Missing required environment variable: ${variable}`);
  }
}

const driver = neo4j.driver(
  process.env.COGNODB_URI,
  neo4j.auth.basic(
    process.env.COGNODB_USERNAME,
    process.env.COGNODB_PASSWORD
  )
);

driver.onError = (error) => {
  console.error(
    "CognoDB driver error:",
    error.message
  );
};

export default driver;