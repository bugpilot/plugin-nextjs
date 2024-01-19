const fs = require("fs");
const packageJson = require("./package.json");

// Specify the file that contains the placeholder
const filePath = "./dist/client/Bugpilot.js";

// Read the content of the file
const fileContent = fs.readFileSync(filePath, "utf8");

// Replace the placeholder with the actual version from package.json
const updatedContent = fileContent.replace(
  "BUGPILOT_VERSION_VALUE",
  packageJson.version
);

// Write the updated content back to the file
fs.writeFileSync(filePath, updatedContent, "utf8");
