#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const repoRoot = path.resolve(__dirname, "..");
const packageJson = readJson(path.join(repoRoot, "package.json"), {});

const MANAGED_ITEMS = [
  "README.md",
  "package.json",
  "bin",
  "agents",
  "templates",
  "standards",
  "workflows",
  "examples"
];

const FEATURE_TEMPLATE_FILES = [
  "reasons-canvas.md",
  "feature-spec.md",
  "implementation-plan.md",
  "test-plan.md",
  "review-checklist.md"
];

const DEFAULT_AGENT_INSTRUCTION_PATH = "AGENTS.md";

main(process.argv.slice(2));

function main(argv) {
  const command = argv[0];

  try {
    if (command === undefined) {
      initProject([]);
      return;
    }

    if (command.startsWith("--") && !["--help", "-h", "--version", "-v"].includes(command)) {
      initProject(argv);
      return;
    }

    switch (command) {
      case "init":
        initProject(argv.slice(1));
        break;
      case "sync":
        syncStandards(argv.slice(1));
        break;
      case "feature":
      case "new-feature":
        createFeature(argv.slice(1));
        break;
      case "doctor":
        doctor(argv.slice(1));
        break;
      case "help":
      case "--help":
      case "-h":
        printHelp();
        break;
      case "version":
      case "--version":
      case "-v":
        console.log(packageJson.version || "0.0.0");
        break;
      default:
        fail(`Unknown command: ${command}\n\nRun: ${commandName()} help`);
    }
  } catch (error) {
    fail(error.message);
  }
}

function initProject(argv) {
  const options = parseArgs(argv, {
    boolean: ["force", "dry-run"],
    string: ["standards-path", "docs-path", "feature-id", "feature-name"]
  });

  const target = path.resolve(options.positionals[0] || ".");
  const existingConfig = readConfig(target);
  const standardsPath = normalizeRelative(options["standards-path"] || existingConfig.standardsPath || "ai-delivery-standards");
  const docsPath = normalizeRelative(options["docs-path"] || existingConfig.docsPath || "docs");
  const agentInstructionPath = DEFAULT_AGENT_INSTRUCTION_PATH;
  const featureId = options["feature-id"] || "FEA-001";
  const featureName = options["feature-name"] || "Initial Product Skeleton";
  const dryRun = Boolean(options["dry-run"]);

  ensureDirectory(target, dryRun);
  syncStandards([
    target,
    "--standards-path",
    standardsPath,
    "--skip-agent",
    ...(dryRun ? ["--dry-run"] : [])
  ]);

  const configPath = path.join(target, ".ai-delivery.json");
  const config = buildProjectConfig({ ...existingConfig, standardsPath, docsPath, agentInstructionPath });
  writeText(configPath, `${JSON.stringify(config, null, 2)}\n`, { dryRun, overwrite: options.force });

  ensureAgentInstructions(target, config, { dryRun });

  const aiDeliveryDoc = path.join(target, docsPath, "ai-delivery.md");
  writeText(aiDeliveryDoc, productAiDeliveryTemplate(config), { dryRun, overwrite: options.force });

  const architectureDoc = path.join(target, docsPath, "architecture", "overview.md");
  writeText(architectureDoc, architectureOverviewTemplate(), { dryRun, overwrite: options.force });

  createFeature([
    featureId,
    featureName,
    "--target",
    target,
    "--docs-path",
    docsPath,
    ...(options.force ? ["--force"] : []),
    ...(dryRun ? ["--dry-run"] : [])
  ]);

  logDone(`Initialized AI delivery standards in ${target}`);
}

function syncStandards(argv) {
  const options = parseArgs(argv, {
    boolean: ["dry-run", "skip-agent"],
    string: ["standards-path"]
  });

  const target = path.resolve(options.positionals[0] || ".");
  const existingConfig = readConfig(target);
  const standardsPath = normalizeRelative(options["standards-path"] || existingConfig.standardsPath || "ai-delivery-standards");
  const agentInstructionPath = DEFAULT_AGENT_INSTRUCTION_PATH;
  const config = buildProjectConfig({ ...existingConfig, standardsPath, agentInstructionPath });
  const destination = path.join(target, standardsPath);
  const dryRun = Boolean(options["dry-run"]);
  const copied = [];

  ensureDirectory(destination, dryRun);

  for (const item of MANAGED_ITEMS) {
    const sourcePath = path.join(repoRoot, item);
    const destinationPath = path.join(destination, item);
    copyManaged(sourcePath, destinationPath, { dryRun, copied });
  }

  const manifestPath = path.join(destination, ".ai-delivery-manifest.json");
  const manifest = {
    package: packageJson.name || "ai-delivery-standards",
    version: packageJson.version || "local",
    syncedAt: new Date().toISOString(),
    managedItems: MANAGED_ITEMS,
    files: copied.map((file) => path.relative(destination, file).split(path.sep).join("/")).sort()
  };
  writeText(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, { dryRun, overwrite: true });
  if (!options["skip-agent"]) {
    ensureAgentInstructions(target, config, { dryRun });
  }

  logDone(`${dryRun ? "Planned sync" : "Synced"} standards to ${destination}`);
}

function createFeature(argv) {
  const options = parseArgs(argv, {
    boolean: ["force", "dry-run"],
    string: ["target", "docs-path"]
  });

  const [featureId, ...nameParts] = options.positionals;
  if (!featureId || nameParts.length === 0) {
    fail(`Usage: ${commandName()} feature <FEATURE-ID> <feature name> [--target <path>]`);
  }

  const target = path.resolve(options.target || ".");
  const config = readConfig(target);
  const docsPath = normalizeRelative(options["docs-path"] || config.docsPath || "docs");
  const featureName = nameParts.join(" ");
  const slug = slugify(featureName);
  const featureFolder = path.join(target, docsPath, "features", `${featureId}-${slug}`);
  const dryRun = Boolean(options["dry-run"]);

  ensureDirectory(featureFolder, dryRun);

  const templateRoot = path.join(repoRoot, "templates");
  for (const file of FEATURE_TEMPLATE_FILES) {
    const source = path.join(templateRoot, file);
    const destination = path.join(featureFolder, file);
    let content = fs.readFileSync(source, "utf8");
    content = hydrateTemplate(content, { featureId, featureName });
    writeText(destination, content, { dryRun, overwrite: options.force });
  }

  logDone(`${dryRun ? "Planned feature artifacts" : "Created feature artifacts"} in ${featureFolder}`);
}

function doctor(argv) {
  const options = parseArgs(argv, {
    boolean: [],
    string: []
  });

  const target = path.resolve(options.positionals[0] || ".");
  const config = readConfig(target);
  const standardsPath = path.join(target, config.standardsPath || "ai-delivery-standards");
  const docsPath = path.join(target, config.docsPath || "docs");
  const agentInstructionPath = DEFAULT_AGENT_INSTRUCTION_PATH;
  const checks = [];

  checks.push(checkExists(path.join(target, ".ai-delivery.json"), "config .ai-delivery.json"));
  checks.push(checkExists(path.join(target, agentInstructionPath), "root agent instructions"));
  checks.push(checkExists(standardsPath, "standards bundle"));
  checks.push(checkExists(path.join(standardsPath, "templates", "reasons-canvas.md"), "REASONS template"));
  checks.push(checkExists(path.join(standardsPath, "standards", "accessibility.md"), "accessibility standards"));
  checks.push(checkExists(path.join(docsPath, "ai-delivery.md"), "product AI delivery guide"));
  checks.push(checkExists(path.join(docsPath, "architecture", "overview.md"), "architecture overview"));

  const featureRoot = path.join(docsPath, "features");
  const featureFolders = fs.existsSync(featureRoot)
    ? fs.readdirSync(featureRoot, { withFileTypes: true }).filter((entry) => entry.isDirectory())
    : [];
  checks.push({
    ok: featureFolders.length > 0,
    label: "at least one feature artifact folder",
    detail: featureRoot
  });

  for (const check of checks) {
    console.log(`${check.ok ? "ok" : "missing"} - ${check.label}${check.detail ? ` (${check.detail})` : ""}`);
  }

  if (checks.some((check) => !check.ok)) {
    process.exitCode = 1;
    return;
  }

  logDone(`AI delivery setup looks ready in ${target}`);
}

function parseArgs(argv, schema) {
  const options = { positionals: [] };
  const booleans = new Set(schema.boolean || []);
  const strings = new Set(schema.string || []);

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (!arg.startsWith("--")) {
      options.positionals.push(arg);
      continue;
    }

    const [rawName, inlineValue] = arg.slice(2).split("=");
    if (booleans.has(rawName)) {
      options[rawName] = inlineValue === undefined ? true : inlineValue !== "false";
      continue;
    }

    if (strings.has(rawName)) {
      const value = inlineValue === undefined ? argv[index + 1] : inlineValue;
      if (value === undefined || value.startsWith("--")) {
        fail(`Missing value for --${rawName}`);
      }
      options[rawName] = value;
      if (inlineValue === undefined) index += 1;
      continue;
    }

    fail(`Unknown option: --${rawName}`);
  }

  return options;
}

function copyManaged(sourcePath, destinationPath, context) {
  const stat = fs.statSync(sourcePath);

  if (stat.isDirectory()) {
    ensureDirectory(destinationPath, context.dryRun);
    for (const entry of fs.readdirSync(sourcePath)) {
      if (entry === ".git" || entry === "node_modules") continue;
      copyManaged(path.join(sourcePath, entry), path.join(destinationPath, entry), context);
    }
    return;
  }

  if (!stat.isFile()) return;

  const content = fs.readFileSync(sourcePath);
  const existing = fs.existsSync(destinationPath) ? fs.readFileSync(destinationPath) : null;
  if (existing && Buffer.compare(existing, content) === 0) {
    return;
  }

  if (!context.dryRun) {
    fs.mkdirSync(path.dirname(destinationPath), { recursive: true });
    fs.writeFileSync(destinationPath, content);
    fs.chmodSync(destinationPath, stat.mode & 0o777);
  }
  context.copied.push(destinationPath);
  console.log(`${context.dryRun ? "would copy" : "copied"} ${path.relative(process.cwd(), destinationPath)}`);
}

function writeText(filePath, content, options = {}) {
  const exists = fs.existsSync(filePath);
  if (exists && !options.overwrite) {
    console.log(`kept ${path.relative(process.cwd(), filePath)}`);
    return;
  }

  if (!options.dryRun) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, content);
  }
  console.log(`${options.dryRun ? "would write" : exists ? "updated" : "created"} ${path.relative(process.cwd(), filePath)}`);
}

function ensureAgentInstructions(target, config, options = {}) {
  const agentDoc = path.join(target, DEFAULT_AGENT_INSTRUCTION_PATH);
  writeText(agentDoc, productAgentTemplate(config), { dryRun: options.dryRun, overwrite: false });
}

function buildProjectConfig(overrides = {}) {
  const standardsPath = normalizeRelative(overrides.standardsPath || "ai-delivery-standards");
  const docsPath = normalizeRelative(overrides.docsPath || "docs");

  return {
    standardsPath,
    docsPath,
    agentInstructionPath: normalizeRelative(overrides.agentInstructionPath || DEFAULT_AGENT_INSTRUCTION_PATH),
    featurePath: normalizeRelative(overrides.featurePath || path.posix.join(docsPath, "features")),
    decisionPath: normalizeRelative(overrides.decisionPath || path.posix.join(docsPath, "decisions")),
    requiredFeatureArtifacts: Array.isArray(overrides.requiredFeatureArtifacts)
      ? overrides.requiredFeatureArtifacts
      : FEATURE_TEMPLATE_FILES,
    standardsVersion: overrides.standardsVersion || packageJson.version || "local"
  };
}

function hydrateTemplate(content, values) {
  return content
    .replaceAll("feature_id: FEA-000", `feature_id: ${values.featureId}`)
    .replaceAll('feature_name: ""', `feature_name: "${values.featureName}"`)
    .replaceAll("created: YYYY-MM-DD", `created: ${today()}`)
    .replaceAll("updated: YYYY-MM-DD", `updated: ${today()}`);
}

function productAgentTemplate(config) {
  return `# Agent Instructions

This repository uses Structured-Prompt-Driven Development through \`ai-delivery-standards\`.

Every AI agent working in this project must follow this file before making changes.

## Prime Directive

No non-trivial implementation before specification.

For new features, bug fixes, refactors, security-sensitive changes, UI changes, API changes, data model changes, infrastructure changes, and AI behavior changes, the agent must create or update the required artifacts before editing production code.

## Required Reading Order

Before planning or implementation, read:

1. \`${config.docsPath}/ai-delivery.md\`
2. \`${config.docsPath}/architecture/overview.md\`
3. \`${config.standardsPath}/agents/generic-agent.md\`
4. The agent-specific file if applicable:
   - \`${config.standardsPath}/agents/codex.md\`
   - \`${config.standardsPath}/agents/claude-code.md\`
   - \`${config.standardsPath}/agents/cursor.md\`
5. The relevant workflow in \`${config.standardsPath}/workflows/\`
6. The relevant standards in \`${config.standardsPath}/standards/\`

## Required Feature Artifacts

Every feature must have:

\`\`\`text
${config.featurePath}/<ID>-<slug>/
  reasons-canvas.md
  feature-spec.md
  implementation-plan.md
  test-plan.md
  review-checklist.md
\`\`\`

Use:

\`\`\`bash
node ${config.standardsPath}/bin/ai-delivery.js feature FEA-002 "Feature Name"
\`\`\`

## New Feature Rule

For a brand-new feature:

1. Inspect existing code, tests, docs, routes, schemas, and conventions.
2. Create or complete the feature artifact folder.
3. Define acceptance criteria, scope out, entities, approach, structure, operations, norms, and safeguards.
4. Create the implementation plan and test plan.
5. Stop if authorization, data ownership, API contracts, accessibility, security, or acceptance criteria are unclear.
6. Implement only after the artifacts are coherent.
7. Work operation by operation.
8. Update tests with the behavior change.
9. Complete the review checklist.
10. Sync specs with final code.

## Autonomous Feature Queue Rule

When one request contains multiple independent features:

1. Use \`${config.standardsPath}/workflows/autonomous-feature-queue.md\`.
2. Maintain \`${config.featurePath}/feature-queue.md\` from \`${config.standardsPath}/templates/feature-queue.md\`.
3. Work one feature at a time.
4. Restate the feature objective and acceptance criteria before implementation.
5. Implement the smallest clean solution.
6. Run relevant tests, lint, typecheck, build, or manual validation.
7. Complete self-review and critic review.
8. Apply fixes only when they improve correctness, maintainability, security, accessibility, performance, observability, or required user-facing behavior.
9. Stop revising after acceptance criteria pass or after two review/fix cycles.
10. Mark the feature complete with files changed, validation run, remaining risks, and next feature selected.
11. Continue automatically to the next unblocked feature.

Ask the user only when the workflow's stop conditions apply.

## Existing Feature Rule

For a feature that already exists but predates this workflow:

1. Use \`${config.standardsPath}/workflows/existing-feature-change.md\`.
2. Document current production behavior before changing it.
3. Clearly separate current behavior, requested change, scope out, risks, and safeguards.
4. Add regression tests for existing intended behavior.
5. Implement the smallest safe amendment or fix.
6. Avoid opportunistic redesign unless an ADR and implementation plan explicitly approve it.
7. Sync the specs with final implementation.

## Bug Fix Rule

For defects:

1. Use \`${config.standardsPath}/workflows/bug-fix.md\`.
2. Reproduce or bound the failure.
3. Document root cause.
4. Add a regression test that would fail before the fix.
5. Implement the smallest root-cause fix.
6. Update related feature specs if expected behavior changes.

## Quality Standards

Apply these standards as relevant:

- \`${config.standardsPath}/standards/engineering.md\`
- \`${config.standardsPath}/standards/frontend.md\`
- \`${config.standardsPath}/standards/backend.md\`
- \`${config.standardsPath}/standards/ui-ux.md\`
- \`${config.standardsPath}/standards/accessibility.md\`
- \`${config.standardsPath}/standards/testing.md\`
- \`${config.standardsPath}/standards/security.md\`
- \`${config.standardsPath}/standards/performance.md\`
- \`${config.standardsPath}/standards/observability.md\`
- \`${config.standardsPath}/standards/api-design.md\`

## Refusal Conditions

The agent must not implement and must ask for clarification when:

- Acceptance criteria are missing or contradictory.
- Authorization rules are unclear.
- Data ownership, tenant boundary, or privacy impact is unclear.
- The change affects security, payments, regulated data, legal/compliance behavior, or destructive migrations without safeguards.
- The requested change conflicts with documented scope out.
- Implementation would require broad redesign not approved by the spec.

## Review And Sync

Before finishing:

1. Run relevant validation commands.
2. Complete \`review-checklist.md\`.
3. Confirm acceptance criteria map to tests.
4. Confirm accessibility, security, performance, observability, and API impacts are handled.
5. Update specs if final code behavior differs from the planned behavior.
6. Report validation evidence and remaining risks.

## Copy-Paste Agent Prompt

\`\`\`text
Use AGENTS.md and ai-delivery-standards.

Task: <describe task>

Before implementation:
1. Read AGENTS.md.
2. Read docs/ai-delivery.md and docs/architecture/overview.md.
3. Use the relevant workflow in ai-delivery-standards/workflows/.
4. Create or update the required feature or bug artifacts.
5. Do not edit production code until the spec, implementation plan, and test plan are coherent.

During implementation:
- Work operation by operation.
- Keep scope constrained to the approved spec.
- Add or update tests with the behavior change.
- Apply the relevant standards.
- Stop and update specs first if implementation needs to diverge.

Before completion:
- Run validation.
- Complete self-review and critic review.
- Complete the review checklist.
- Sync specs with final behavior.
\`\`\`
`;
}

function productAiDeliveryTemplate(config) {
  return `# AI Delivery Guide

This product uses \`${config.standardsPath}\` as its AI-assisted delivery standards bundle.

## Required Feature Artifacts

Every non-trivial feature must include:

- \`reasons-canvas.md\`
- \`feature-spec.md\`
- \`implementation-plan.md\`
- \`test-plan.md\`
- \`review-checklist.md\`

## Required Rule

No implementation before specification.

Agents must inspect the repository, create or update artifacts, implement only approved operations, validate changes, and sync specs with final code.

When a request contains multiple independent features, agents must use the autonomous feature queue workflow, maintain \`${config.featurePath}/feature-queue.md\`, complete self-review and critic review for each feature, and continue to the next unblocked feature automatically.

## Local Paths

| Purpose | Path |
| --- | --- |
| Standards bundle | \`${config.standardsPath}\` |
| Product docs | \`${config.docsPath}\` |
| Feature artifacts | \`${config.featurePath}\` |
| Architecture decisions | \`${config.decisionPath}\` |

## Common Commands

\`\`\`bash
ai-delivery feature FEA-002 "Feature name"
ai-delivery sync .
ai-delivery doctor .
\`\`\`

## Review Gate

Before merge:

- Specs exist and are current.
- Acceptance criteria map to tests.
- Accessibility, security, testing, observability, and API standards are applied.
- Self-review and critic review are recorded for AI-generated implementation work.
- Validation evidence is recorded.
- Specs match final implementation.
`;
}

function architectureOverviewTemplate() {
  return `# Architecture Overview

## Product Purpose

Describe the product, target users, and primary workflows.

## System Context

\`\`\`mermaid
flowchart LR
  User["User"] --> App["Application"]
  App --> Data["Data Store"]
  App --> External["External Services"]
\`\`\`

## Major Components

| Component | Responsibility | Owner |
| --- | --- | --- |
| Application Shell | Routing, authentication state, and shared layout | Product Engineering |
| Domain Services | Product workflows and business rules | Product Engineering |
| Data Access | Persistence boundaries and query patterns | Platform or Product Engineering |

## Data Stores

| Store | Data | Notes |
| --- | --- | --- |
| Primary Database | Product-owned records | Define engine, schema owner, backup, retention, and migration process before implementation |
| Object Storage | Files or exports, if used | Define access policy, lifecycle, and virus scanning requirements before implementation |

## External Integrations

| Integration | Purpose | Failure Behavior |
| --- | --- | --- |
| Identity Provider | Authenticate users and provide claims | Fail closed; do not allow unauthenticated access |
| Email Provider | Send product notifications, if used | Queue, retry safely, and expose delivery failures to operators |

## Security Boundary

Document authentication, authorization, tenant boundaries, and sensitive data classes.

## Observability Baseline

Document logs, metrics, traces, dashboards, and runbooks.
`;
}

function readConfig(target) {
  return readJson(path.join(target, ".ai-delivery.json"), {});
}

function readJson(filePath, fallback) {
  if (!fs.existsSync(filePath)) return fallback;
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function checkExists(filePath, label) {
  return {
    ok: fs.existsSync(filePath),
    label,
    detail: filePath
  };
}

function ensureDirectory(directory, dryRun) {
  if (dryRun) {
    console.log(`would ensure ${path.relative(process.cwd(), directory) || "."}`);
    return;
  }
  fs.mkdirSync(directory, { recursive: true });
}

function normalizeRelative(value) {
  const normalized = value.replaceAll("\\", "/").replace(/^\/+/, "");
  if (!normalized || normalized.includes("..")) {
    fail(`Path must be a relative path without '..': ${value}`);
  }
  return normalized;
}

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "feature";
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function logDone(message) {
  console.log(`done - ${message}`);
}

function commandName() {
  const invoked = path.basename(process.argv[1] || "ai-delivery").replace(/\.js$/, "");
  return invoked || "ai-delivery";
}

function fail(message) {
  console.error(message);
  process.exit(1);
}

function printHelp() {
  const cli = commandName();
  console.log(`${cli} ${packageJson.version || ""}

Usage:
  ${cli}
  ${cli} init [target] [options]
  ${cli} sync [target] [options]
  ${cli} feature <FEATURE-ID> <feature name> [options]
  ${cli} doctor [target]

Commands:
  default    With no command, initialize the current directory.
  init       Install/sync standards, create product docs, and create first feature artifacts.
  sync       Sync this standards bundle into a product repository and seed AGENTS.md if missing.
  feature    Create a feature artifact folder from the required templates.
  doctor     Check whether a repository has the expected AI delivery setup.

Options:
  --standards-path <path>  Standards bundle path in the target repo. Default: ai-delivery-standards
  --docs-path <path>       Product docs path. Default: docs
  --feature-id <id>        Initial feature ID for init. Default: FEA-001
  --feature-name <name>    Initial feature name for init. Default: Initial Product Skeleton
  --target <path>          Target repo for feature command. Default: .
  --force                  Overwrite generated product docs or feature artifacts.
  --dry-run                Print planned writes without changing files.

Examples:
  ${cli}
  ${cli} --dry-run
  ${cli} init ../my-product --feature-name "Initial Product Skeleton"
  ${cli} feature FEA-042 "Scoped Help Assistant" --target ../my-product
  ${cli} sync ../my-product
  ${cli} doctor ../my-product
`);
}
