import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const root = resolve(__dirname, '..');

function fail(message) {
  console.error(`Policy violation: ${message}`);
  process.exitCode = 1;
}

function requireFile(path, description) {
  try {
    return readFileSync(path, 'utf8');
  } catch (error) {
    fail(`Unable to read ${description} at ${path}: ${error.message}`);
    return '';
  }
}

const agentsPath = resolve(root, 'AGENTS.md');
const agentsContent = requireFile(agentsPath, 'AGENTS.md');

if (agentsContent) {
  const requiredStatements = [
    'Never parse API payloads with regular expressions',
    'Never guess at field names or shape changes that are not documented',
    'Always run the schema verification suite',
  ];

  for (const statement of requiredStatements) {
    if (!agentsContent.includes(statement)) {
      fail(`AGENTS.md must include the policy statement: "${statement}"`);
    }
  }
}

const prTemplatePath = resolve(root, '.github', 'pull_request_template.md');
const prTemplateContent = requireFile(prTemplatePath, 'pull request template');

if (prTemplateContent) {
  if (!/##\s+Schema Verification Checklist/i.test(prTemplateContent)) {
    fail('Pull request template must include a "Schema Verification Checklist" heading.');
  }

  const checklistItems = [
    'I fetched the latest schema documentation',
    'I ran the schema verification suite',
    'I avoided regex parsing of API payloads',
  ];

  for (const item of checklistItems) {
    if (!prTemplateContent.includes(item)) {
      fail(`Pull request template must include checklist item mentioning: "${item}".`);
    }
  }
}

if (process.exitCode) {
  process.exit(process.exitCode);
}
