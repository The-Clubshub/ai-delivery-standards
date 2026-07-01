#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const readline = require("readline");
const https = require("https");
const { execFile } = require("child_process");
const { handleLoopCommand } = require("../lib/loop-engine");

const repoRoot = path.resolve(__dirname, "..");
const packageJson = readJson(path.join(repoRoot, "package.json"), {});

const MANAGED_ITEMS = [
  "README.md",
  "package.json",
  "bin",
  "lib",
  "agents",
  "commands",
  "roles",
  "schemas",
  "templates",
  "standards",
  "workflows",
  "examples"
];

const LEGACY_FEATURE_TEMPLATE_FILES = [
  "reasons-canvas.md",
  "feature-spec.md",
  "implementation-plan.md",
  "test-plan.md",
  "review-checklist.md"
];

const V2_FEATURE_ARTIFACTS = [
  "state.json",
  "requirements.md",
  "plan.md",
  "tests.md",
  "review.md",
  "approval.md",
  "memory.md",
  "activity.md",
  "handoff.md"
];

const DEFAULT_AGENT_INSTRUCTION_PATH = "AGENTS.md";
const DEFAULT_AI_PATH = ".ai";
const DEFAULT_DOCS_PATH = ".ai";
const DEFAULT_STANDARDS_PATH = ".ai/ai-delivery-standards";
const APPROVAL_GATES = ["requirements", "plan", "implementation"];
const APPROVAL_GATE_LABELS = {
  requirements: "Requirements",
  plan: "Plan",
  implementation: "Implementation"
};
const APPROVAL_GATE_TRANSITIONS = {
  requirements: "requirements_pending_review -> plan_draft",
  plan: "plan_pending_review -> building",
  implementation: "ready_for_human_review -> complete"
};
const APPROVAL_GATE_COMMANDS = {
  requirements: "/approve-requirements",
  plan: "/approve-plan",
  implementation: "/complete"
};
const APPROVAL_GATE_REQUIRED_BEFORE = {
  requirements: "Planning",
  plan: "Building",
  implementation: "Completion"
};
const DEFAULT_APPROVAL_POLICY = {
  requirements: "human_required",
  plan: "human_required",
  implementation: "human_required"
};

const WORKBENCH_CHOICES = [
  {
    key: "codex",
    label: "Codex Desktop/CLI",
    description: "Run requirements, planning, build, review, and test work in Codex."
  },
  {
    key: "claude",
    label: "Claude Desktop/CLI",
    description: "Run requirements, planning, build, review, and test work in Claude."
  },
  {
    key: "cursor",
    label: "Cursor",
    description: "Run requirements, planning, build, review, and test work in Cursor."
  }
];

const WORKBENCH_MANUAL_MODEL_CHOICE = "__manual__";
const CLAUDE_MODELS_URL = "https://api.anthropic.com/v1/models";
const OPENAI_MODELS_URL = "https://api.openai.com/v1/models";
const WORKBENCH_MODELS_CACHE_TTL_MS = 5 * 60 * 1000;
const WORKBENCH_MODELS_TIMEOUT_MS = 2500;
const WORKBENCH_MODELS_CACHE = new Map();
const CODEX_FALLBACK_MODELS = ["GPT-5.5", "GPT-5.3 Codex", "GPT-5.4 mini"];

const STAGE_MODEL_FIELDS = [
  {
    key: "requirements",
    label: "Requirements",
    defaultModel: "GPT-5.5"
  },
  {
    key: "planning",
    label: "Planning",
    defaultModel: "GPT-5.5"
  },
  {
    key: "building",
    label: "Building",
    defaultModel: "GPT-5.3 Codex"
  },
  {
    key: "reviewing",
    label: "Reviewing",
    defaultModel: "GPT-5.5"
  },
  {
    key: "testing",
    label: "Testing",
    defaultModel: "GPT-5.3 Codex"
  },
  {
    key: "syncCompletion",
    label: "Sync and completion",
    defaultModel: "GPT-5.4 mini"
  },
  {
    key: "highRiskReview",
    label: "High-risk review",
    defaultModel: "GPT-5.5"
  }
];

const APPROVAL_POLICY_ALIASES = {
  required: "human_required",
  "human-required": "human_required",
  human_required: "human_required",
  human: "human_required",
  manual: "human_required",
  true: "human_required",
  optional: "not_required",
  automated: "not_required",
  "not-required": "not_required",
  not_required: "not_required",
  skip: "not_required",
  false: "not_required"
};

const DEFAULT_AI_WORKBENCH = {
  provider: "codex",
  mode: "desktop_or_cli",
  stageModels: STAGE_MODEL_FIELDS.reduce((models, field) => {
    models[field.key] = field.defaultModel;
    return models;
  }, {})
};

main(process.argv.slice(2)).catch((error) => {
  fail(error.message);
});

async function main(argv) {
  const command = argv[0];

  try {
    if (command === undefined) {
      await initProject([]);
      return;
    }

    if (command.startsWith("--") && !["--help", "-h", "--version", "-v"].includes(command)) {
      await initProject(argv);
      return;
    }

    switch (command) {
      case "init":
        await initProject(argv.slice(1));
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
      case "loop":
        handleLoopCommand(argv.slice(1), { commandName, fail, logDone });
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

async function initProject(argv) {
  const options = parseArgs(argv, {
    boolean: ["force", "dry-run", "autonomous-after-requirements"],
    string: [
      "standards-path",
      "docs-path",
      "ai-path",
      "feature-root",
      "feature-id",
      "feature-name",
      "approval-policy",
      "requirements-approval",
      "plan-approval",
      "implementation-approval"
    ]
  });

  const target = path.resolve(options.positionals[0] || ".");
  const existingConfig = readConfig(target);
  const pathConfig = options.force ? {} : existingConfig;
  const agentInstructionPath = DEFAULT_AGENT_INSTRUCTION_PATH;
  const dryRun = Boolean(options["dry-run"]);
  const aiPath = normalizeRelative(options["ai-path"] || pathConfig.aiPath || DEFAULT_AI_PATH);
  const docsPath = normalizeDocsPath(options["docs-path"] || pathConfig.docsPath, aiPath);
  const onboarding = await resolveInitOnboarding({
    target,
    options,
    paths: {
      aiPath,
      standardsPath: normalizeRelative(options["standards-path"] || pathConfig.standardsPath || DEFAULT_STANDARDS_PATH),
      docsPath,
      featurePath: normalizeFeaturePath(options["feature-root"] || pathConfig.featurePath, docsPath, aiPath),
      decisionPath: normalizeDocsChildPath(pathConfig.decisionPath, docsPath, aiPath, "decisions")
    },
    initialFeature: {
      id: options["feature-id"] || "FEA-001",
      name: options["feature-name"] || "Initial Product Skeleton"
    },
    approvalPolicy: resolveApprovalPolicyOptions(pathConfig.approvalPolicy, options),
    aiWorkbench: pathConfig.aiWorkbench
  });

  ensureDirectory(target, dryRun);
  syncStandards([
    target,
    "--standards-path",
    onboarding.paths.standardsPath,
    "--skip-agent",
    ...(options.force ? ["--force"] : []),
    ...(dryRun ? ["--dry-run"] : [])
  ]);

  const configPath = path.join(target, ".ai-delivery.json");
  const config = buildProjectConfig({
    standardsPath: onboarding.paths.standardsPath,
    docsPath: onboarding.paths.docsPath,
    aiPath: onboarding.paths.aiPath,
    agentInstructionPath,
    approvalPolicy: onboarding.approvalPolicy,
    aiWorkbench: onboarding.aiWorkbench,
    featurePath: onboarding.paths.featurePath,
    legacyFeaturePath: pathConfig.legacyFeaturePath,
    decisionPath: onboarding.paths.decisionPath,
    requiredFeatureArtifacts: pathConfig.requiredFeatureArtifacts,
    legacyFeatureArtifacts: pathConfig.legacyFeatureArtifacts,
    commandProtocol: pathConfig.commandProtocol,
    standardsVersion: pathConfig.standardsVersion
  });
  writeText(configPath, `${JSON.stringify(config, null, 2)}\n`, { dryRun, overwrite: true });

  ensureGitignore(target, config.aiPath, { dryRun });
  ensureAiOperatingSystem(target, config, { dryRun, overwrite: options.force, overwriteConfig: true });
  ensureAgentInstructions(target, config, { dryRun, overwrite: true });

  const aiDeliveryDoc = path.join(target, config.docsPath, "ai-delivery.md");
  writeText(aiDeliveryDoc, productAiDeliveryTemplate(config), { dryRun, overwrite: true });

  const architectureDoc = path.join(target, config.docsPath, "architecture", "overview.md");
  writeText(architectureDoc, architectureOverviewTemplate(), { dryRun, overwrite: options.force });

  createFeature([
    onboarding.initialFeature.id,
    onboarding.initialFeature.name,
    "--target",
    target,
    "--feature-root",
    config.featurePath,
    ...(options.force ? ["--force"] : []),
    ...(dryRun ? ["--dry-run"] : [])
  ], config);

  logDone(`Initialized AI delivery standards in ${target}`);
}

function syncStandards(argv) {
  const options = parseArgs(argv, {
    boolean: ["dry-run", "skip-agent", "force"],
    string: ["standards-path"]
  });

  const target = path.resolve(options.positionals[0] || ".");
  const existingConfig = options.force ? {} : readConfig(target);
  const standardsPath = normalizeRelative(options["standards-path"] || existingConfig.standardsPath || DEFAULT_STANDARDS_PATH);
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

function createFeature(argv, configOverride = null) {
  const options = parseArgs(argv, {
    boolean: ["force", "dry-run"],
    string: ["target", "docs-path", "feature-root"]
  });

  const [featureId, ...nameParts] = options.positionals;
  if (!featureId || nameParts.length === 0) {
    fail(`Usage: ${commandName()} feature <FEATURE-ID> <feature name> [--target <path>]`);
  }

  const target = path.resolve(options.target || ".");
  const config = configOverride || readConfig(target);
  const docsPath = normalizeDocsPath(options["docs-path"] || config.docsPath, config.aiPath);
  const featureConfig = buildProjectConfig({
    ...config,
    docsPath,
    featurePath: options["feature-root"]
      ? options["feature-root"]
      : options["docs-path"]
        ? path.posix.join(docsPath, "features")
        : config.featurePath
  });
  const featureRoot = featureConfig.featurePath;
  const featureName = nameParts.join(" ");
  const featureFolderName = featureDirectoryName(featureId, featureName);
  const featureFolder = path.join(target, featureRoot, featureFolderName);
  const dryRun = Boolean(options["dry-run"]);

  ensureDirectory(featureFolder, dryRun);
  ensureDirectory(path.join(featureFolder, "artifacts"), dryRun);
  ensureDirectory(path.join(featureFolder, "artifacts", "screenshots"), dryRun);
  ensureDirectory(path.join(featureFolder, "artifacts", "logs"), dryRun);
  ensureDirectory(path.join(featureFolder, "artifacts", "evals"), dryRun);
  ensureDirectory(path.join(featureFolder, "artifacts", "exports"), dryRun);

  writeJson(path.join(featureFolder, "state.json"), featureStateTemplate(featureId, featureName, featureConfig.approvalPolicy), { dryRun, overwrite: options.force });
  writeText(path.join(featureFolder, "requirements.md"), featureRequirementsTemplate(featureId, featureName), { dryRun, overwrite: options.force });
  writeText(path.join(featureFolder, "plan.md"), featurePlanTemplate(featureId, featureName, featureConfig.approvalPolicy, featureConfig.aiWorkbench), { dryRun, overwrite: options.force });
  writeText(path.join(featureFolder, "tests.md"), featureTestsTemplate(featureId, featureName, featureConfig.aiWorkbench), { dryRun, overwrite: options.force });
  writeText(path.join(featureFolder, "review.md"), featureReviewTemplate(featureId, featureName, featureConfig.aiWorkbench), { dryRun, overwrite: options.force });
  writeText(path.join(featureFolder, "approval.md"), featureApprovalTemplate(featureId, featureName, featureConfig.approvalPolicy), { dryRun, overwrite: options.force });
  writeText(path.join(featureFolder, "memory.md"), featureMemoryTemplate(featureId, featureName), { dryRun, overwrite: options.force });
  writeText(path.join(featureFolder, "activity.md"), featureActivityTemplate(featureId, featureName), { dryRun, overwrite: options.force });
  writeText(path.join(featureFolder, "handoff.md"), featureHandoffTemplate(featureId, featureName), { dryRun, overwrite: options.force });

  updateFeatureRegistry(target, featureConfig, featureId, featureName, featureFolderName, { dryRun });
  updateProjectState(target, featureConfig, featureId, { dryRun, overwrite: true });

  logDone(`${dryRun ? "Planned feature artifacts" : "Created feature artifacts"} in ${featureFolder}`);
}

function doctor(argv) {
  const options = parseArgs(argv, {
    boolean: [],
    string: []
  });

  const target = path.resolve(options.positionals[0] || ".");
  const config = readConfig(target);
  const standardsPath = path.join(target, config.standardsPath || DEFAULT_STANDARDS_PATH);
  const docsPath = path.join(target, config.docsPath || DEFAULT_DOCS_PATH);
  const aiPath = path.join(target, config.aiPath || DEFAULT_AI_PATH);
  const featurePath = path.join(target, config.featurePath || path.posix.join(config.docsPath || DEFAULT_DOCS_PATH, "features"));
  const agentInstructionPath = DEFAULT_AGENT_INSTRUCTION_PATH;
  const checks = [];

  checks.push(checkExists(path.join(target, ".ai-delivery.json"), "config .ai-delivery.json"));
  checks.push(checkFileContains(path.join(target, ".gitignore"), ".ai/", "git ignores local AI operating-system files"));
  checks.push(checkExists(path.join(aiPath, "config.json"), "V2 config .ai/config.json"));
  checks.push(checkExists(path.join(aiPath, "registry.json"), "V2 feature registry"));
  checks.push(checkExists(path.join(aiPath, "state.json"), "V2 project state"));
  checks.push(checkExists(path.join(aiPath, "memory", "project.md"), "V2 project memory"));
  checks.push(checkExists(path.join(aiPath, "memory", "validation.md"), "V2 validation memory"));
  checks.push(checkExists(path.join(target, agentInstructionPath), "root agent instructions"));
  checks.push(checkExists(standardsPath, "standards bundle"));
  checks.push(checkExists(path.join(standardsPath, "commands", "command-protocol.md"), "V2 command protocol"));
  checks.push(checkExists(path.join(standardsPath, "roles", "builder-agent.md"), "V2 role definitions"));
  checks.push(checkExists(path.join(standardsPath, "schemas", "feature-state.schema.json"), "V2 feature state schema"));
  checks.push(checkExists(path.join(standardsPath, "schemas", "ai-workbench.schema.json"), "AI workbench schema"));
  checks.push(checkExists(path.join(standardsPath, "templates", "v2", "feature", "requirements.md"), "V2 requirements template"));
  checks.push(checkExists(path.join(standardsPath, "standards", "ai-workbench.md"), "AI workbench standard"));
  checks.push(checkExists(path.join(standardsPath, "standards", "codex-goal-mode.md"), "Codex goal mode standard"));
  checks.push(checkExists(path.join(standardsPath, "standards", "accessibility.md"), "accessibility standards"));
  checks.push(...checkAiWorkbench(config.aiWorkbench));
  checks.push(checkExists(path.join(docsPath, "ai-delivery.md"), "product AI delivery guide"));
  checks.push(checkExists(path.join(docsPath, "architecture", "overview.md"), "architecture overview"));
  checks.push(checkExists(path.join(target, config.decisionPath || path.posix.join(config.aiPath || DEFAULT_AI_PATH, "decisions")), "architecture decisions folder"));

  const featureFolders = fs.existsSync(featurePath)
    ? fs.readdirSync(featurePath, { withFileTypes: true }).filter((entry) => entry.isDirectory())
    : [];
  checks.push({
    ok: featureFolders.length > 0,
    label: "at least one V2 feature artifact folder",
    detail: featurePath
  });
  if (featureFolders.length > 0) {
    const firstFeature = path.join(featurePath, featureFolders[0].name);
    for (const file of V2_FEATURE_ARTIFACTS) {
      checks.push(checkExists(path.join(firstFeature, file), `V2 feature artifact ${file}`));
    }
    checks.push(checkFileContains(path.join(firstFeature, "plan.md"), "## AI Workbench And Models", "V2 feature plan AI workbench and models"));
    checks.push(checkFileContains(path.join(firstFeature, "review.md"), "## AI Workbench And Models", "V2 feature review AI workbench and models"));
  }

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

function writeJson(filePath, value, options = {}) {
  writeText(filePath, `${JSON.stringify(value, null, 2)}\n`, options);
}

function ensureGitignore(target, aiPath = DEFAULT_AI_PATH, options = {}) {
  const gitignorePath = path.join(target, ".gitignore");
  const entries = Array.from(new Set([`${normalizeRelative(aiPath).replace(/\/+$/, "")}/`, ".ai/"]));
  const existing = fs.existsSync(gitignorePath) ? fs.readFileSync(gitignorePath, "utf8") : "";
  const lines = existing.split(/\r?\n/).map((line) => line.trim());
  const missing = entries.filter((entry) => !lines.includes(entry));
  if (missing.length === 0) {
    console.log(`kept ${path.relative(process.cwd(), gitignorePath)}`);
    return;
  }

  const prefix = existing && !existing.endsWith("\n") ? "\n" : "";
  const content = `${existing}${prefix}${missing.join("\n")}\n`;
  writeText(gitignorePath, content, { dryRun: options.dryRun, overwrite: true });
}

function ensureAgentInstructions(target, config, options = {}) {
  const agentDoc = path.join(target, DEFAULT_AGENT_INSTRUCTION_PATH);
  writeText(agentDoc, productAgentTemplate(config), { dryRun: options.dryRun, overwrite: Boolean(options.overwrite) });
}

function ensureAiOperatingSystem(target, config, options = {}) {
  const aiPath = path.join(target, config.aiPath);
  ensureDirectory(aiPath, options.dryRun);
  ensureDirectory(path.join(aiPath, "memory"), options.dryRun);
  ensureDirectory(path.join(aiPath, "queues"), options.dryRun);
  ensureDirectory(path.join(aiPath, "agents"), options.dryRun);
  ensureDirectory(path.join(target, config.decisionPath), options.dryRun);

  writeJson(path.join(aiPath, "config.json"), aiConfigTemplate(config), { dryRun: options.dryRun, overwrite: Boolean(options.overwriteConfig || options.overwrite) });
  writeJson(path.join(aiPath, "registry.json"), featureRegistryTemplate(), { dryRun: options.dryRun, overwrite: options.overwrite });
  writeJson(path.join(aiPath, "state.json"), projectStateTemplate(), { dryRun: options.dryRun, overwrite: options.overwrite });

  writeText(path.join(aiPath, "memory", "project.md"), projectMemoryTemplate(), { dryRun: options.dryRun, overwrite: options.overwrite });
  writeText(path.join(aiPath, "memory", "glossary.md"), glossaryMemoryTemplate(), { dryRun: options.dryRun, overwrite: options.overwrite });
  writeText(path.join(aiPath, "memory", "constraints.md"), constraintsMemoryTemplate(), { dryRun: options.dryRun, overwrite: options.overwrite });
  writeText(path.join(aiPath, "memory", "decisions.md"), decisionsMemoryTemplate(), { dryRun: options.dryRun, overwrite: options.overwrite });
  writeText(path.join(aiPath, "memory", "validation.md"), validationMemoryTemplate(), { dryRun: options.dryRun, overwrite: options.overwrite });
  writeText(path.join(aiPath, "queues", "active.md"), activeQueueTemplate(), { dryRun: options.dryRun, overwrite: options.overwrite });
  writeText(path.join(aiPath, "agents", "role-overrides.md"), roleOverridesTemplate(), { dryRun: options.dryRun, overwrite: options.overwrite });
  writeText(path.join(aiPath, "agents", "tool-adapters.md"), toolAdaptersTemplate(), { dryRun: options.dryRun, overwrite: options.overwrite });
}

function buildProjectConfig(overrides = {}) {
  const aiPath = normalizeRelative(overrides.aiPath || DEFAULT_AI_PATH);
  const standardsPath = normalizeRelative(overrides.standardsPath || DEFAULT_STANDARDS_PATH);
  const docsPath = normalizeDocsPath(overrides.docsPath, aiPath);
  const featurePath = normalizeFeaturePath(overrides.featurePath, docsPath, aiPath);
  const legacyFeaturePath = normalizeRelative(overrides.legacyFeaturePath || "docs/features");
  const approvalPolicy = normalizeApprovalPolicy(overrides.approvalPolicy);
  const aiWorkbench = normalizeAiWorkbench(overrides.aiWorkbench);

  return {
    operatingSystemVersion: "v2",
    standardsPath,
    docsPath,
    aiPath,
    agentInstructionPath: normalizeRelative(overrides.agentInstructionPath || DEFAULT_AGENT_INSTRUCTION_PATH),
    featurePath,
    legacyFeaturePath,
    decisionPath: normalizeDocsChildPath(overrides.decisionPath, docsPath, aiPath, "decisions"),
    requiredFeatureArtifacts: Array.isArray(overrides.requiredFeatureArtifacts)
      ? overrides.requiredFeatureArtifacts
      : V2_FEATURE_ARTIFACTS,
    legacyFeatureArtifacts: LEGACY_FEATURE_TEMPLATE_FILES,
    approvalPolicy,
    aiWorkbench,
    commandProtocol: overrides.commandProtocol || "universal-command-protocol-v2",
    standardsVersion: overrides.standardsVersion || packageJson.version || "local"
  };
}

function resolveApprovalPolicyOptions(basePolicy, options) {
  const optionPolicy = {};

  if (options["approval-policy"]) {
    const value = normalizeApprovalPolicyValue(options["approval-policy"], "--approval-policy");
    for (const gate of APPROVAL_GATES) {
      optionPolicy[gate] = value;
    }
  }

  if (options["autonomous-after-requirements"]) {
    optionPolicy.requirements = "human_required";
    optionPolicy.plan = "not_required";
    optionPolicy.implementation = "not_required";
  }

  const gateOptions = {
    requirements: "requirements-approval",
    plan: "plan-approval",
    implementation: "implementation-approval"
  };

  for (const [gate, optionName] of Object.entries(gateOptions)) {
    if (options[optionName]) {
      optionPolicy[gate] = normalizeApprovalPolicyValue(options[optionName], `--${optionName}`);
    }
  }

  return normalizeApprovalPolicy({ ...normalizeApprovalPolicy(basePolicy), ...optionPolicy });
}

async function resolveInitOnboarding(input) {
  const result = {
    paths: { ...input.paths },
    initialFeature: { ...input.initialFeature },
    approvalPolicy: normalizeApprovalPolicy(input.approvalPolicy),
    aiWorkbench: normalizeAiWorkbench(input.aiWorkbench)
  };

  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    fail("init requires interactive onboarding. Run it in a terminal so the project config can be chosen explicitly.");
  }

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  try {
    console.log("");
    console.log("AI delivery setup");
    console.log("Answer a few config questions. Pick one desktop/CLI workbench, then choose models for each delivery stage.");
    console.log("");

    result.paths = await askInitPaths(rl, result.paths);
    result.initialFeature = await askInitialFeature(rl, result.initialFeature);
    result.approvalPolicy = await askApprovalPolicy(rl, result.approvalPolicy);
    result.aiWorkbench = await askAiWorkbench(rl, result.aiWorkbench);
    console.log("");
  } finally {
    rl.close();
  }

  return result;
}

async function askInitPaths(rl, currentPaths) {
  console.log("");
  console.log("Project paths");
  const aiPath = normalizeRelative(await askText(rl, "AI operating-system path", currentPaths.aiPath || DEFAULT_AI_PATH));
  const standardsPath = normalizeRelative(await askText(rl, "Vendored standards path", currentPaths.standardsPath || DEFAULT_STANDARDS_PATH));
  const docsPath = normalizeDocsPath(await askText(rl, "Product docs path", currentPaths.docsPath || aiPath), aiPath);
  const featurePath = normalizeFeaturePath(await askText(rl, "Feature lifecycle root", currentPaths.featurePath || path.posix.join(docsPath, "features")), docsPath, aiPath);
  const decisionPath = normalizeDocsChildPath(await askText(rl, "Architecture decisions path", currentPaths.decisionPath || path.posix.join(docsPath, "decisions")), docsPath, aiPath, "decisions");
  return {
    aiPath,
    standardsPath,
    docsPath,
    featurePath,
    decisionPath
  };
}

async function askInitialFeature(rl, currentFeature) {
  console.log("");
  console.log("Initial feature");
  return {
    id: await askText(rl, "Initial feature ID", currentFeature.id || "FEA-001"),
    name: await askText(rl, "Initial feature name", currentFeature.name || "Initial Product Skeleton")
  };
}

async function askApprovalPolicy(rl, currentPolicy) {
  console.log("");
  console.log("Human approval gates");
  const policy = normalizeApprovalPolicy(currentPolicy);
  const updated = {};
  for (const gate of APPROVAL_GATES) {
    const humanRequired = await askYesNo(
      rl,
      `Require mandatory human approval for ${APPROVAL_GATE_LABELS[gate]}?`,
      policy[gate] === "human_required"
    );
    updated[gate] = humanRequired ? "human_required" : "not_required";
  }
  return normalizeApprovalPolicy(updated);
}

async function askAiWorkbench(rl, currentWorkbench) {
  console.log("");
  console.log("AI workbench");
  console.log("Choose the desktop app or CLI that will run AI delivery work.");
  const current = normalizeAiWorkbench(currentWorkbench);
  const workbenchChoice = await askChoice(rl, "Choose the workbench", WORKBENCH_CHOICES, current.provider);
  const discoveredModels = await discoverWorkbenchModels(workbenchChoice.key);
  const useOneModel = await askYesNo(rl, "Use one model for every stage?", allStageModelsMatch(current.stageModels));
  const stageModels = {};

  if (useOneModel) {
    const model = await askWorkbenchModel(
      rl,
      "Model for every stage",
      workbenchChoice.key,
      firstStageModel(current.stageModels),
      discoveredModels
    );
    for (const field of STAGE_MODEL_FIELDS) {
      stageModels[field.key] = model;
    }
    return normalizeAiWorkbench({
      provider: workbenchChoice.key,
      mode: "desktop_or_cli",
      stageModels
    });
  }

  console.log("");
  console.log("Stage models");
  for (const field of STAGE_MODEL_FIELDS) {
    stageModels[field.key] = await askWorkbenchModel(
      rl,
      `${field.label} model`,
      workbenchChoice.key,
      current.stageModels[field.key] || field.defaultModel,
      discoveredModels
    );
  }

  return normalizeAiWorkbench({
    provider: workbenchChoice.key,
    mode: "desktop_or_cli",
    stageModels
  });
}

function normalizeAiWorkbench(aiWorkbench = DEFAULT_AI_WORKBENCH) {
  const configured = aiWorkbench && typeof aiWorkbench === "object" && !Array.isArray(aiWorkbench)
    ? aiWorkbench
    : {};
  const provider = normalizeWorkbenchProvider(configured.provider || DEFAULT_AI_WORKBENCH.provider);
  const configuredModels = configured.stageModels && typeof configured.stageModels === "object"
    ? configured.stageModels
    : {};
  const stageModels = {};
  for (const field of STAGE_MODEL_FIELDS) {
    stageModels[field.key] = normalizeModelName(configuredModels[field.key] || DEFAULT_AI_WORKBENCH.stageModels[field.key]);
  }
  return {
    provider,
    mode: "desktop_or_cli",
    stageModels
  };
}

function normalizeWorkbenchProvider(provider) {
  const value = String(provider || "").trim().toLowerCase();
  if (value === "claude-code" || value === "claude-desktop" || value === "claude-cli") return "claude";
  if (WORKBENCH_CHOICES.some((choice) => choice.key === value)) return value;
  return DEFAULT_AI_WORKBENCH.provider;
}

function buildWorkbenchModelChoices(provider, discoveredModels = [], currentModel = "workbench-default") {
  const normalizedCurrent = normalizeModelName(currentModel);
  const modelSet = normalizeModelNames(discoveredModels);
  const choices = [];
  const seen = new Set();

  const addChoice = (model, label, description) => {
    const normalizedModel = normalizeModelName(model);
    if (!normalizedModel || seen.has(normalizedModel)) return;
    seen.add(normalizedModel);
    choices.push({
      key: normalizedModel,
      label: label || normalizedModel,
      description: description || "Use this model"
    });
  };

  if (provider === "codex") {
    addChoice("workbench-default", "workbench-default", "Use the model currently selected in Codex");
  } else {
    addChoice("workbench-default", "workbench-default", "Use the model currently selected in the workbench");
  }

  for (const model of modelSet) {
    addChoice(model);
  }

  if (normalizedCurrent && !seen.has(normalizedCurrent)) {
    addChoice(normalizedCurrent, normalizedCurrent, "Configured value for this stage");
  }

  addChoice(WORKBENCH_MANUAL_MODEL_CHOICE, "Custom model id", "Enter a model id manually");
  return choices;
}

function normalizeModelNames(values) {
  const unique = new Set();
  for (const value of Array.isArray(values) ? values : []) {
    const normalized = normalizeModelName(value);
    if (normalized !== "workbench-default") {
      unique.add(normalized);
    }
  }
  return Array.from(unique).sort((a, b) => a.localeCompare(b));
}

async function askWorkbenchModel(rl, label, provider, defaultModel, discoveredModels = []) {
  const defaultLabel = normalizeModelName(defaultModel);
  const choices = buildWorkbenchModelChoices(provider, discoveredModels, defaultLabel);
  const selected = await askChoice(rl, `${label}`, choices, defaultLabel);
  if (selected.key === WORKBENCH_MANUAL_MODEL_CHOICE) {
    return await askText(
      rl,
      `${label} (manual)`,
      defaultLabel,
      { required: true }
    );
  }
  return selected.key;
}

async function discoverWorkbenchModels(provider) {
  const normalized = normalizeWorkbenchProvider(provider);
  const cached = WORKBENCH_MODELS_CACHE.get(normalized);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.models;
  }

  let models = [];
  if (normalized === "claude") {
    models = await discoverClaudeModels();
  } else if (normalized === "cursor") {
    models = await discoverCursorModels();
  } else if (normalized === "codex") {
    models = await discoverCodexModels();
  }

  const normalizedModels = normalizeModelNames(models);
  WORKBENCH_MODELS_CACHE.set(normalized, {
    models: normalizedModels,
    expiresAt: Date.now() + WORKBENCH_MODELS_CACHE_TTL_MS
  });
  return normalizedModels;
}

async function discoverCodexModels() {
  try {
    const response = await execJson("codex", ["debug", "models"], {
      timeout: WORKBENCH_MODELS_TIMEOUT_MS
    });
    const models = Array.isArray(response?.models)
      ? response.models
        .filter((item) => item?.visibility !== "hidden")
        .map((item) => item?.slug || item?.id || item?.model)
        .filter(Boolean)
      : [];
    return models.length > 0 ? models : CODEX_FALLBACK_MODELS;
  } catch (error) {
    return CODEX_FALLBACK_MODELS;
  }
}

async function discoverClaudeModels() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return [];

  try {
    const response = await fetchJson(CLAUDE_MODELS_URL, {
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01"
      },
      timeout: WORKBENCH_MODELS_TIMEOUT_MS
    });
    return Array.isArray(response?.data)
      ? response.data.map((item) => (typeof item === "string" ? item : item?.id)).filter(Boolean)
      : [];
  } catch (error) {
    return [];
  }
}

async function discoverCursorModels() {
  const models = [];
  const openAiModels = await discoverOpenAiModels();
  const claudeModels = await discoverClaudeModels();
  if (openAiModels.length > 0) {
    models.push(...openAiModels);
  }
  if (claudeModels.length > 0) {
    models.push(...claudeModels);
  }
  return models;
}

async function discoverOpenAiModels() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return [];

  try {
    const response = await fetchJson(OPENAI_MODELS_URL, {
      headers: {
        Authorization: `Bearer ${apiKey}`
      },
      timeout: WORKBENCH_MODELS_TIMEOUT_MS
    });
    return Array.isArray(response?.data) ? response.data.map((item) => item?.id).filter(Boolean) : [];
  } catch (error) {
    return [];
  }
}

function execJson(command, args = [], { timeout = WORKBENCH_MODELS_TIMEOUT_MS } = {}) {
  return new Promise((resolve, reject) => {
    execFile(command, args, {
      timeout,
      maxBuffer: 10 * 1024 * 1024
    }, (error, stdout) => {
      if (error) {
        reject(error);
        return;
      }

      try {
        resolve(JSON.parse(stdout));
      } catch (parseError) {
        reject(parseError);
      }
    });
  });
}

function fetchJson(url, { headers = {}, timeout = WORKBENCH_MODELS_TIMEOUT_MS } = {}) {
  return new Promise((resolve, reject) => {
    const request = https.request(url, {
      method: "GET",
      timeout,
      headers: {
        Accept: "application/json",
        ...headers
      }
    }, (response) => {
      let body = "";
      response.on("data", (chunk) => {
        body += String(chunk);
      });
      response.on("end", () => {
        try {
          const parsed = body ? JSON.parse(body) : {};
          resolve(parsed);
        } catch (error) {
          reject(error);
        }
      });
    });

    request.on("timeout", () => {
      request.destroy(new Error("Model discovery request timed out"));
    });
    request.on("error", (error) => {
      reject(error);
    });
    request.end();
  });
}

function normalizeModelName(value) {
  const model = String(value || "").trim();
  return model || "workbench-default";
}

function allStageModelsMatch(stageModels = {}) {
  const models = STAGE_MODEL_FIELDS.map((field) => stageModels[field.key]).filter(Boolean);
  return models.length > 0 && models.every((model) => model === models[0]);
}

function firstStageModel(stageModels = {}) {
  for (const field of STAGE_MODEL_FIELDS) {
    if (stageModels[field.key]) return stageModels[field.key];
  }
  return "workbench-default";
}

async function askChoice(rl, heading, choices, defaultKey) {
  const defaultIndex = Math.max(0, choices.findIndex((choice) => choice.key === defaultKey));
  while (true) {
    console.log("");
    console.log(heading);
    choices.forEach((choice, index) => {
      const marker = index === defaultIndex ? " (default)" : "";
      console.log(`  ${index + 1}. ${choice.label}${marker} - ${choice.description}`);
    });
    const answer = (await askQuestion(rl, `Choose [${defaultIndex + 1}]: `)).trim().toLowerCase();
    if (!answer) return choices[defaultIndex];

    const number = Number(answer);
    if (Number.isInteger(number) && number >= 1 && number <= choices.length) {
      return choices[number - 1];
    }

    const match = choices.find((choice) => choice.key === answer || choice.label.toLowerCase() === answer);
    if (match) return match;

    console.log("Please choose one of the listed options.");
  }
}

async function askText(rl, label, defaultValue, options = {}) {
  const required = options.required !== false;
  const suffix = defaultValue ? ` [${defaultValue}]` : "";
  while (true) {
    const answer = (await askQuestion(rl, `${label}${suffix}: `)).trim();
    if (answer) return answer;
    if (defaultValue !== undefined) return defaultValue;
    if (!required) return "";
    console.log("Please enter a value.");
  }
}

async function askSecret(rl, label, options = {}) {
  const required = options.required === true;
  while (true) {
    const originalWrite = rl._writeToOutput;
    rl.output.write(`${label}: `);
    rl._writeToOutput = function writeMuted(output) {
      if (output && output.includes("\n")) {
        rl.output.write(output);
        return;
      }
      rl.output.write("*");
    };

    const answer = await new Promise((resolve) => {
      rl.once("line", resolve);
    });
    rl._writeToOutput = originalWrite;
    rl.output.write("\n");

    const trimmed = String(answer || "").trim();
    if (trimmed || !required) return trimmed;
    console.log("Please enter a value.");
  }
}

async function askYesNo(rl, label, defaultValue) {
  const suffix = defaultValue ? " [Y/n]: " : " [y/N]: ";
  while (true) {
    const answer = (await askQuestion(rl, `${label}${suffix}`)).trim().toLowerCase();
    if (!answer) return Boolean(defaultValue);
    if (["y", "yes", "true"].includes(answer)) return true;
    if (["n", "no", "false"].includes(answer)) return false;
    console.log("Please answer yes or no.");
  }
}

function askQuestion(rl, question) {
  return new Promise((resolve) => {
    rl.question(question, resolve);
  });
}

function normalizeApprovalPolicy(policy = {}) {
  const normalized = { ...DEFAULT_APPROVAL_POLICY };
  for (const gate of APPROVAL_GATES) {
    if (policy[gate] !== undefined) {
      normalized[gate] = normalizeApprovalPolicyValue(policy[gate], `approvalPolicy.${gate}`);
    }
  }
  return normalized;
}

function normalizeApprovalPolicyValue(value, source) {
  const key = String(value).trim().toLowerCase();
  const normalized = APPROVAL_POLICY_ALIASES[key];
  if (!normalized) {
    fail(`${source} must be one of: human_required, not_required`);
  }
  return normalized;
}

function hydrateTemplate(content, values) {
  return content
    .replaceAll("feature_id: FEA-000", `feature_id: ${values.featureId}`)
    .replaceAll('feature_name: ""', `feature_name: "${values.featureName}"`)
    .replaceAll("created: YYYY-MM-DD", `created: ${today()}`)
    .replaceAll("updated: YYYY-MM-DD", `updated: ${today()}`);
}

function aiConfigTemplate(config) {
  return {
    operatingSystemVersion: "v2",
    standardsVersion: config.standardsVersion,
    standardsPath: config.standardsPath,
    agentInstructionPath: config.agentInstructionPath,
    docsPath: config.docsPath,
    aiPath: config.aiPath,
    featurePath: config.featurePath,
    legacyFeaturePath: config.legacyFeaturePath,
    decisionPath: config.decisionPath,
    commandProtocol: config.commandProtocol,
    approvalPolicy: config.approvalPolicy,
    aiWorkbench: config.aiWorkbench,
    requiredFeatureArtifacts: config.requiredFeatureArtifacts
  };
}

function featureRegistryTemplate() {
  return {
    artifact: "feature-registry",
    operatingSystemVersion: "v2",
    activeFeatureId: null,
    features: [],
    updatedAt: now()
  };
}

function projectStateTemplate() {
  return {
    artifact: "project-state",
    operatingSystemVersion: "v2",
    mode: "normal",
    activeFeatureId: null,
    blocked: false,
    updatedAt: now()
  };
}

function featureStateTemplate(featureId, featureName, approvalPolicy = DEFAULT_APPROVAL_POLICY) {
  const policy = normalizeApprovalPolicy(approvalPolicy);
  return {
    artifact: "feature-state",
    operatingSystemVersion: "v2",
    featureId,
    title: featureName,
    state: "requirements_draft",
    previousState: "intake",
    resumeState: null,
    activeRole: "Requirements Agent",
    createdAt: now(),
    updatedAt: now(),
    artifacts: {
      requirements: "requirements.md",
      plan: "plan.md",
      tests: "tests.md",
      review: "review.md",
      approval: "approval.md",
      memory: "memory.md",
      activity: "activity.md",
      handoff: "handoff.md"
    },
    approvals: initialApprovals(policy),
    lastTransition: {
      from: "intake",
      to: "requirements_draft",
      by: "ai-delivery",
      at: now(),
      command: "/start-feature"
    },
    blockers: [],
    reviewCycles: {
      count: 0,
      limit: 2
    }
  };
}

function initialApprovals(approvalPolicy) {
  const approvals = {};
  for (const gate of APPROVAL_GATES) {
    approvals[gate] = approvalPolicy[gate] === "not_required"
      ? { status: "not_required", source: ".ai/config.json approvalPolicy" }
      : { status: "pending" };
  }
  return approvals;
}

function isGateHumanRequired(approvalPolicy, gate) {
  return normalizeApprovalPolicy(approvalPolicy)[gate] === "human_required";
}

function approvalRequiredLabel(approvalPolicy, gate) {
  return isGateHumanRequired(approvalPolicy, gate) ? "Yes" : "No";
}

function approvalStatusLabel(approvalPolicy, gate) {
  return isGateHumanRequired(approvalPolicy, gate) ? "Pending" : "Not required";
}

function approvalPolicyRows(approvalPolicy) {
  const policy = normalizeApprovalPolicy(approvalPolicy);
  return APPROVAL_GATES
    .map((gate) => `| ${APPROVAL_GATE_LABELS[gate]} | ${approvalRequiredLabel(policy, gate)} | ${approvalStatusLabel(policy, gate)} |`)
    .join("\n");
}

function approvalPolicyTransitionRows(approvalPolicy) {
  const policy = normalizeApprovalPolicy(approvalPolicy);
  return APPROVAL_GATES
    .map((gate) => `| ${APPROVAL_GATE_LABELS[gate]} | \`${policy[gate]}\` | \`${APPROVAL_GATE_TRANSITIONS[gate]}\` | \`${APPROVAL_GATE_COMMANDS[gate]}\` |`)
    .join("\n");
}

function approvalPolicyRequiredBeforeRows(approvalPolicy) {
  const policy = normalizeApprovalPolicy(approvalPolicy);
  return APPROVAL_GATES
    .map((gate) => `| ${APPROVAL_GATE_LABELS[gate]} | \`${policy[gate]}\` | \`${APPROVAL_GATE_COMMANDS[gate]}\` | ${APPROVAL_GATE_REQUIRED_BEFORE[gate]} |`)
    .join("\n");
}

function approvalPolicyJson(approvalPolicy) {
  return JSON.stringify(normalizeApprovalPolicy(approvalPolicy), null, 2);
}

function aiWorkbenchRows(aiWorkbench) {
  const workbench = normalizeAiWorkbench(aiWorkbench);
  return STAGE_MODEL_FIELDS
    .map((field) => `| ${field.label} | \`${workbench.provider}\` | \`${workbench.stageModels[field.key]}\` |`)
    .join("\n");
}

function aiWorkbenchYaml(aiWorkbench) {
  const workbench = normalizeAiWorkbench(aiWorkbench);
  return [
    "ai_workbench:",
    `  provider: ${workbench.provider}`,
    "  mode: desktop_or_cli",
    "  stage_models:",
    ...STAGE_MODEL_FIELDS.map((field) => `    ${field.key}: ${workbench.stageModels[field.key]}`)
  ].join("\n");
}

function updateFeatureRegistry(target, config, featureId, featureName, featureFolderName, options = {}) {
  const registryPath = path.join(target, config.aiPath, "registry.json");
  const registry = readJson(registryPath, featureRegistryTemplate());
  const features = Array.isArray(registry.features) ? registry.features : [];
  const existingIndex = features.findIndex((feature) => feature.id === featureId);
  const entry = {
    id: featureId,
    title: featureName,
    path: path.posix.join(config.featurePath, featureFolderName),
    state: "requirements_draft",
    updatedAt: now()
  };

  if (existingIndex === -1) {
    features.push(entry);
  } else {
    features[existingIndex] = { ...features[existingIndex], ...entry };
  }

  writeJson(registryPath, {
    ...registry,
    artifact: "feature-registry",
    operatingSystemVersion: "v2",
    activeFeatureId: featureId,
    features,
    updatedAt: now()
  }, { dryRun: options.dryRun, overwrite: true });
}

function updateProjectState(target, config, featureId, options = {}) {
  const projectStatePath = path.join(target, config.aiPath, "state.json");
  const projectState = readJson(projectStatePath, projectStateTemplate());
  writeJson(projectStatePath, {
    ...projectState,
    artifact: "project-state",
    operatingSystemVersion: "v2",
    mode: "normal",
    activeFeatureId: featureId,
    blocked: false,
    updatedAt: now()
  }, { dryRun: options.dryRun, overwrite: options.overwrite });
}

function productAgentTemplate(config) {
  return `# Agent Instructions

This repository uses \`${config.standardsPath}\` V2 as its AI project operating system.

Every AI agent working in this project must follow this file before making changes.

## Prime Directive

No agent may implement, plan, review, test, approve, or complete work unless the active feature state allows that action.

The universal lifecycle is:

\`\`\`text
Idea
-> Requirements Agent
-> Requirements Gate
-> Planner Agent
-> Plan Gate
-> Builder Agent
-> Reviewer Agent
-> Tester Agent
-> Implementation Gate
-> Complete
\`\`\`

## Higher-Precedence Instruction Order

When instructions conflict, follow the highest-precedence applicable source:

1. Active system, developer, platform, and tool instructions.
2. The user's current request.
3. This repository \`AGENTS.md\`.
4. The active feature state and approvals under the path named by \`${config.aiPath}/registry.json\`.
5. Feature, bug, refactor, architecture, and product docs in this repository.
6. Vendored \`${config.standardsPath}\` guidance.
7. General model defaults or habits.

If a request conflicts with the state machine, the state machine wins. Stop and explain the next allowed action or required approval.

## Codex Goal Mode

When the selected workbench is Codex, non-trivial or multi-feature work should run under an active \`/goal\`.

\`/goal\` is the continuous objective above individual features, plans, and queue items. It controls scope, queue priority, implementation focus, review focus, and completion criteria.

Goal rules:

- Set or confirm \`/goal\` before \`/start-feature\` for large or multi-step work.
- Map every feature, queue item, plan operation, and completion summary back to the active goal.
- Keep the goal active until it is complete, blocked, or explicitly changed by the user.
- Do not let \`/goal\` override approval gates, feature state, safety rules, or newer user instructions.
- If \`/goal\` is unavailable in the active Codex surface, record the same objective in \`${config.aiPath}/queues/active.md\` or the active feature artifacts and continue under the normal lifecycle.

## Boot Sequence

Before acting, every agent must read:

1. \`AGENTS.md\`
2. \`${config.aiPath}/config.json\`
3. \`${config.aiPath}/registry.json\`
4. \`${config.aiPath}/state.json\`
5. The active feature \`${config.featurePath}/<ID>-<slug>/state.json\`
6. The active feature \`${config.featurePath}/<ID>-<slug>/approval.md\`
7. The relevant role definition in \`${config.standardsPath}/roles/\`
8. The lifecycle and command protocol:
   - \`${config.standardsPath}/workflows/lifecycle.md\`
   - \`${config.standardsPath}/commands/command-protocol.md\`
9. Relevant standards in \`${config.standardsPath}/standards/\`
   - \`${config.standardsPath}/standards/codex-goal-mode.md\` when the selected workbench is Codex.

If the active feature cannot be identified, report \`/status\` and ask for a feature ID only if it cannot be inferred safely.

## Operating System Paths

| Purpose | Path |
| --- | --- |
| Project config | \`${config.aiPath}/config.json\` |
| Project state | \`${config.aiPath}/state.json\` |
| Feature registry | \`${config.aiPath}/registry.json\` |
| Project memory | \`${config.aiPath}/memory/\` |
| Feature artifacts | \`${config.featurePath}/<ID>-<slug>/\` |
| Standards bundle | \`${config.standardsPath}/\` |
| Architecture decisions | \`${config.decisionPath}/\` |
| Product docs | \`${config.docsPath}/\` |

## Required States

Valid feature states are:

- \`intake\`
- \`requirements_draft\`
- \`requirements_pending_review\`
- \`requirements_approved\`
- \`plan_draft\`
- \`plan_pending_review\`
- \`plan_approved\`
- \`building\`
- \`reviewing\`
- \`testing\`
- \`ready_for_human_review\`
- \`complete\`
- \`blocked\`

\`requirements_approved\` and \`plan_approved\` are legacy/transient states. In normal flow, approval moves immediately to \`plan_draft\` or \`building\`; do not stop and wait for \`/continue\`.

## Role Selection

State determines the primary role:

| State | Role |
| --- | --- |
| \`intake\`, \`requirements_draft\`, \`requirements_pending_review\` | Requirements Agent |
| \`requirements_approved\` (legacy), \`plan_draft\`, \`plan_pending_review\` | Planner Agent |
| \`plan_approved\` (legacy), \`building\` | Builder Agent |
| \`reviewing\` | Reviewer Agent |
| \`testing\` | Tester Agent |
| \`ready_for_human_review\`, \`complete\` | Sync Agent |
| \`blocked\` | Current role or Sync Agent |

## Required Feature Artifacts

Every feature must have:

\`\`\`text
${config.featurePath}/<ID>-<slug>/
  state.json
  requirements.md
  plan.md
  tests.md
  review.md
  approval.md
  memory.md
  activity.md
  handoff.md
\`\`\`

Use:

\`\`\`bash
node ${config.standardsPath}/bin/ai-delivery.js feature FEA-002 "Feature Name"
\`\`\`

## Approval Policy

Gate policy is read from \`${config.aiPath}/config.json\`:

\`\`\`json
${approvalPolicyJson(config.approvalPolicy)}
\`\`\`

| Gate | Policy | Transition | Command when human approval is required |
| --- | --- | --- | --- |
${approvalPolicyTransitionRows(config.approvalPolicy)}

\`human_required\` means an explicit human approval must be recorded before the transition. \`not_required\` means the responsible agent may advance the gate after required artifacts or evidence are ready, recording \`not_required\` in \`${config.featurePath}/<ID>-<slug>/approval.md\` and \`${config.featurePath}/<ID>-<slug>/state.json\`.

Approval commands are compound actions. After \`/approve-requirements\`, move to \`plan_draft\` and start planning. After \`/approve-plan\`, move to \`building\` and start implementation. After \`/complete\`, move to \`complete\`. Do not require \`/continue\` after a successful approval command.

For broad requests such as building a full website, the active plan and \`${config.aiPath}/queues/active.md\` must cover the full original request before implementation starts. When the user approves that plan or says to implement it, the approval covers every queued feature inside the original request. Continue through all unblocked queued features without asking for separate approval before each feature; ask again only for a stop condition, a user-directed scope change, or work outside the original request.

Gate evidence must be recorded in \`${config.featurePath}/<ID>-<slug>/approval.md\` and mirrored in \`${config.featurePath}/<ID>-<slug>/state.json\`.

Agents may record human approval after it is given. Agents must never self-approve a \`human_required\` gate or infer approval from silence.

## AI Workbench And Models

\`${config.aiPath}/config.json\` \`aiWorkbench\` records the desktop/CLI workbench and the model to use for each delivery stage.

| Stage | Workbench | Model |
| --- | --- | --- |
${aiWorkbenchRows(config.aiWorkbench)}

Rules:

- Use the configured workbench for AI-assisted delivery work.
- Use the configured stage model when starting requirements, planning, building, reviewing, testing, sync, or completion work.
- Use the \`highRiskReview\` model for final review when work touches auth, permissions, billing, payments, security, customer data, database schema, migrations, tenant boundaries, or architecture.
- If a model is \`workbench-default\`, use the currently selected/default model in the chosen workbench.
- When changing to another configured model, post a visible desktop status update before starting the next stage, for example: \`Switching model: Building / GPT-5.3 Codex -> Reviewing / GPT-5.5\`.
- Plans, reviews, and handoffs should include the simple workbench/model table above.

## Universal Commands

Use these commands in chat, CLI, issues, or PR comments:

- \`/start-feature\`
- \`/status\`
- \`/approve-requirements\`
- \`/approve-plan\`
- \`/build\`
- \`/ai-review\`
- \`/test\`
- \`/continue\`
- \`/complete\`

\`/continue\` is only for resuming after an interruption or stale handoff. It is not part of the normal approval path.

When running in Codex, use \`/goal\` as the top-level objective for large or multi-feature work.

If no CLI subcommand exists for a command, follow the command semantics in \`${config.standardsPath}/commands/command-protocol.md\`.

## Forbidden Actions

Agents must not:

- Build before the requirements gate is satisfied.
- Build before the plan gate is satisfied.
- Plan before the requirements gate is satisfied.
- Complete a feature before the implementation gate is satisfied.
- Self-approve any \`human_required\` gate.
- Skip Reviewer Agent or Tester Agent stages.
- Modify production code while acting as Requirements Agent or Planner Agent.
- Modify production behavior while acting as Reviewer Agent or Tester Agent unless the lifecycle returns to \`building\`.
- Expand scope beyond approved requirements and plan.
- Hide unresolved blockers, test failures, security risks, accessibility gaps, or spec drift.

## Drift Rule

If implementation reality contradicts approved requirements or plan:

1. Stop the current action.
2. Record the drift in \`activity.md\` or \`review.md\`.
3. Return to the appropriate earlier state:
   - Requirements change: \`requirements_draft\`
   - Plan change only: \`plan_draft\`
   - Implementation defect: \`building\`
4. Satisfy the configured gate again before continuing.

## Runtime Command Policy

Use the package manager and validation commands declared by this repository. If no policy exists, inspect local scripts and lockfiles before choosing commands.

## Refusal Conditions

The agent must refuse and explain the next allowed action or required approval when:

- The requested action is not allowed in the current state.
- Required gate evidence is missing, stale, revoked, or changes requested.
- Acceptance criteria are missing or contradictory.
- Authorization rules are unclear.
- Data ownership, tenant boundary, or privacy impact is unclear.
- The change affects security, payments, regulated data, legal/compliance behavior, or destructive migrations without safeguards.
- The requested change conflicts with documented scope out.
- Implementation would require broad redesign not approved by the spec.

## Review And Sync

Before finishing:

1. Confirm feature state is current.
2. Update required artifacts.
3. Record approval status correctly.
4. Record validation evidence when validation was run.
5. Record remaining risks and blockers.
6. Update \`${config.aiPath}/registry.json\` and \`${config.aiPath}/state.json\` when active feature state changes.

## Copy-Paste Agent Prompt

\`\`\`text
Use AGENTS.md and ${config.standardsPath} V2.

Task: <describe task>

Before implementation:
1. Read AGENTS.md.
2. Read .ai/config.json, .ai/registry.json, and .ai/state.json.
3. Read the active feature state and approval files.
4. Determine the current role from the state machine.
5. Do not edit production code until requirements and plan gates are satisfied.
6. Confirm the active plan records the configured workbench and stage models.

During implementation:
- Work only from approved plan operations.
- Follow the configured AI workbench and stage model profile.
- Add or update tests with the behavior change.
- Apply the relevant standards.
- Stop and return to the correct draft state if implementation needs to diverge.

Before completion:
- Run validation.
- Complete review and testing stages.
- Record implementation gate evidence before marking complete.
\`\`\`
`;
}

function productAiDeliveryTemplate(config) {
  return `# AI Delivery Guide

This product uses \`${config.standardsPath}\` as its AI-assisted delivery standards bundle and \`${config.aiPath}\` as its V2 AI operating-system control plane.

## Operating System Paths

| Purpose | Path |
| --- | --- |
| Agent bootloader | \`${config.agentInstructionPath}\` |
| AI config | \`${config.aiPath}/config.json\` |
| Project state | \`${config.aiPath}/state.json\` |
| Feature registry | \`${config.aiPath}/registry.json\` |
| Project memory | \`${config.aiPath}/memory/\` |
| Feature lifecycle folders | \`${config.featurePath}/<ID>-<slug>/\` |
| Standards bundle | \`${config.standardsPath}/\` |
| Architecture decisions | \`${config.decisionPath}/\` |
| Architecture docs | \`${config.docsPath}/architecture/\` |

## Required Lifecycle

Every non-trivial feature must move through:

\`\`\`text
intake
-> requirements_draft
-> requirements_pending_review
-> plan_draft
-> plan_pending_review
-> building
-> reviewing
-> testing
-> ready_for_human_review
-> complete
\`\`\`

The feature may enter \`blocked\` from any non-terminal state.

\`requirements_approved\` and \`plan_approved\` are legacy/transient states. In normal flow, approval moves immediately to \`plan_draft\` or \`building\`.

## Required Feature Artifacts

Every feature must include:

\`\`\`text
${config.featurePath}/<ID>-<slug>/
  state.json
  requirements.md
  plan.md
  tests.md
  review.md
  approval.md
  memory.md
  activity.md
  handoff.md
\`\`\`

## Required Rule

No implementation before the requirements and plan gates are satisfied according to \`${config.aiPath}/config.json\`.

Agents must inspect \`${config.aiPath}\`, determine current state, act only in the allowed role, update lifecycle artifacts, validate changes, and sync state before handoff.

## Approval Policy

Gate policy:

| Gate | Policy | Command when human approval is required | Required Before |
| --- | --- | --- | --- |
${approvalPolicyRequiredBeforeRows(config.approvalPolicy)}

\`human_required\` gates need explicit human approval. \`not_required\` gates can advance automatically after the required artifact or evidence exists. Gate evidence lives in \`${config.featurePath}/<ID>-<slug>/approval.md\` and is mirrored in \`state.json\`. Satisfying a gate immediately starts the next lifecycle action; \`/continue\` is not required after approval.

For broad requests such as building a full website, the plan must cover the full original request before implementation starts. When the user approves that plan or says to implement it, the agent must continue through every unblocked feature in \`${config.aiPath}/queues/active.md\` without asking for separate approval before each feature. Ask again only for a stop condition, a user-directed scope change, or work outside the original request.

## Codex Goal Mode

When Codex is the selected workbench, use \`/goal\` as the continuous objective above individual features, plans, and queue items.

- Set or confirm \`/goal\` before large or multi-feature work.
- Keep feature queues and plans aligned to the active goal.
- Keep the goal active until complete, blocked, or explicitly changed by the user.
- If \`/goal\` is unavailable, record the same objective in \`${config.aiPath}/queues/active.md\` or the active feature artifacts.

## Standard Roles

- Requirements Agent
- Planner Agent
- Builder Agent
- Reviewer Agent
- Tester Agent
- Sync Agent

Role behavior is defined in \`${config.standardsPath}/roles/\`.

## AI Workbench And Models

The selected desktop/CLI workbench and stage models are configured in \`${config.aiPath}/config.json\` \`aiWorkbench\`.

| Stage | Workbench | Model |
| --- | --- | --- |
${aiWorkbenchRows(config.aiWorkbench)}

Use \`highRiskReview\` for final review when work touches auth, permissions, billing, payments, security, customer data, database schema, migrations, tenant boundaries, or architecture. Use \`syncCompletion\` for Sync Agent handoff and completion summaries. \`workbench-default\` means use the model currently selected in the chosen workbench.

When the agent changes to another configured model, the desktop should show a visible status update before the next stage starts.

## Universal Commands

- \`/start-feature\`
- \`/status\`
- \`/approve-requirements\`
- \`/approve-plan\`
- \`/build\`
- \`/ai-review\`
- \`/test\`
- \`/continue\`
- \`/complete\`

\`/approve-requirements\`, \`/approve-plan\`, and \`/complete\` immediately advance to the next state. \`/continue\` is only for resuming interrupted work.

## Common Commands

\`\`\`bash
ai-delivery feature FEA-002 "Feature name"
ai-delivery sync .
ai-delivery doctor .
\`\`\`

## Review Gate

Before a feature can be complete:

- Requirements and plan gates are satisfied.
- Implementation was reviewed.
- Tests and validation evidence are recorded.
- Implementation gate is satisfied.
- Feature state is \`complete\`.
`;
}

function projectMemoryTemplate() {
  return `# Project Memory

Use this file for durable product facts that future AI agents may rely on.

## Product Purpose

- <describe product purpose>

## Primary Users

- <user or actor>

## Primary Workflows

- <workflow>

## Important Boundaries

- <boundary>
`;
}

function glossaryMemoryTemplate() {
  return `# Glossary

Use this file for domain vocabulary agents must preserve.

| Term | Meaning | Source |
| --- | --- | --- |
| <term> | <meaning> | <source> |
`;
}

function constraintsMemoryTemplate() {
  return `# Constraints

Use this file for durable business, technical, security, compliance, and operational constraints.

## Technical

- <constraint>

## Security And Privacy

- <constraint>

## Business Or Delivery

- <constraint>
`;
}

function decisionsMemoryTemplate() {
  return `# Decisions

Use this file for lightweight durable decisions that do not need a full ADR.

| Date | Decision | Rationale | Related Feature |
| --- | --- | --- | --- |
| ${today()} | <decision> | <rationale> | <feature> |
`;
}

function validationMemoryTemplate() {
  return `# Validation

Document the commands agents should use before claiming work is complete.

| Check | Command | Notes |
| --- | --- | --- |
| Format | <command> | <notes> |
| Lint | <command> | <notes> |
| Typecheck | <command> | <notes> |
| Unit tests | <command> | <notes> |
| Build | <command> | <notes> |

If a command does not exist yet, record the gap here instead of inventing one.
`;
}

function activeQueueTemplate() {
  return `# Active Feature Queue

Use this file when a request contains multiple independent features or a broad deliverable such as a full website.

## Queue Policy

- This queue is the implementation plan for the full original request.
- Include every known feature, page, flow, integration, shared operation, and validation pass needed to satisfy that request.
- Continue automatically to the next unblocked feature after the user approves this plan or says to implement it.
- Ask the user again only for a stop condition, a user-directed scope change, or work outside the original request.

## Original Request

| Field | Value |
| --- | --- |
| Request | <original user request> |
| Approved Plan Scope | <what implementation approval covers> |
| Out Of Scope | <items not included or deferred> |
| Implementation Agreement | <pending/approved/not_required> |

## Active Goal

| Field | Value |
| --- | --- |
| Codex Goal | <active /goal text or fallback objective> |
| Goal Status | <active/blocked/complete/changed> |
| Completion Criteria | <how the queue proves the goal is done> |

| Order | Feature ID | State | Objective | Dependencies | Notes |
| --- | --- | --- | --- | --- | --- |
| 1 | <FEA-000> | <state> | <objective> | <dependencies> | <notes> |
`;
}

function roleOverridesTemplate() {
  return `# Role Overrides

Project-specific role rules may be stricter than the V2 standard, but they must not bypass configured approval-policy gates.

## Requirements Agent

- <override>

## Planner Agent

- <override>

## Builder Agent

- <override>

## Reviewer Agent

- <override>

## Tester Agent

- <override>

## Sync Agent

- <override>
`;
}

function toolAdaptersTemplate() {
  return `# Tool Adapters

Use this file for project-specific notes for Codex, Claude Code, Cursor, GPT, Gemini, or future agents.

Tool adapters may improve ergonomics but must not override the V2 state machine.
`;
}

function featureRequirementsTemplate(featureId, featureName) {
  return `# Requirements: ${featureName}

\`\`\`yaml
artifact: requirements
feature_id: ${featureId}
feature_name: ${JSON.stringify(featureName)}
state: requirements_draft
owner_role: Requirements Agent
created: ${today()}
updated: ${today()}
\`\`\`

## Summary

Describe the feature, user problem, business value, and implementation boundary.

## Problem Statement

- <problem>

## Users And Actors

| Actor | Goal | Permissions Or Constraints |
| --- | --- | --- |
| <actor> | <goal> | <constraints> |

## Scope In

- <included behavior>

## Scope Out

- <excluded behavior>

## Acceptance Criteria

1. Given <context>, when <action>, then <observable result>.
2. Given <invalid or boundary context>, when <action>, then <safe result>.

## Domain Vocabulary And Entities

| Term Or Entity | Meaning | Rules |
| --- | --- | --- |
| <term> | <meaning> | <rules> |

## User Experience

- Primary flow:
- Loading, empty, error, success, and permission states:
- Accessibility requirements:

## API Or Interface Contracts

- Request:
- Response:
- Errors:

## AI Behavior Contract

Use this section for AI-enabled features.

- Grounding:
- Refusal:
- Output shape:
- Safety:
- Evaluation:

## Non-Functional Requirements

| Area | Requirement | Measure |
| --- | --- | --- |
| Security | <requirement> | <control> |
| Accessibility | <requirement> | <evidence> |
| Observability | <requirement> | <signal> |
| Performance | <requirement> | <budget> |

## Safeguards

| Safeguard | Enforcement | Test Evidence |
| --- | --- | --- |
| <constraint> | <where/how> | <test> |

## Open Questions

| Question | Owner | Needed By | Resolution |
| --- | --- | --- | --- |
| <question> | <owner> | <state> | <resolution> |
`;
}

function featurePlanTemplate(featureId, featureName, approvalPolicy = DEFAULT_APPROVAL_POLICY, aiWorkbench = DEFAULT_AI_WORKBENCH) {
  const policy = normalizeApprovalPolicy(approvalPolicy);
  const requirementsGateStatus = approvalStatusLabel(policy, "requirements");
  return `# Plan: ${featureName}

\`\`\`yaml
artifact: plan
feature_id: ${featureId}
feature_name: ${JSON.stringify(featureName)}
state: not_started
owner_role: Planner Agent
source_requirements: requirements.md
created: ${today()}
updated: ${today()}
\`\`\`

## Preconditions

- [ ] Requirements gate is satisfied in \`approval.md\` (${requirementsGateStatus}).
- [ ] Requirements gate status is mirrored in \`state.json\`.
- [ ] Relevant repository context has been inspected.
- [ ] Relevant standards have been identified.
- [ ] AI workbench and stage models are recorded before work starts.

## Implementation Rules

- Implement only approved scope from \`requirements.md\`.
- Follow the configured AI workbench and stage model profile.
- Work operation by operation.
- Update tests with the operation that changes behavior.
- Stop and return to the right draft state if the implementation needs to diverge.

## AI Workbench And Models

Use the configured stage model for each delivery stage. Use \`syncCompletion\` for Sync Agent handoff and completion summaries. Use \`highRiskReview\` for final review when work touches auth, permissions, billing, payments, security, customer data, database schema, migrations, tenant boundaries, or architecture.

| Stage | Workbench | Model |
| --- | --- | --- |
${aiWorkbenchRows(aiWorkbench)}

## Operation Plan

| Step | Status | Operation | Stage Model | Files Or Modules | Tests | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Not started | <operation> | <model> | <files> | <tests> | <notes> |

## Detailed Operations

### Operation 1: <name>

AI workbench:

\`\`\`yaml
${aiWorkbenchYaml(aiWorkbench)}
\`\`\`

Purpose:

Inputs:

Expected output:

Validation:

Rollback:

## Dependencies And Migrations

| Item | Action | Rollback |
| --- | --- | --- |
| <item> | <action> | <rollback> |

## Configuration And Flags

| Config Or Flag | Default | Purpose |
| --- | --- | --- |
| <name> | <default> | <purpose> |

## Rollout And Rollback

- Rollout:
- Rollback:
- Monitoring:

## Completion Checklist

- [ ] Operations are ordered and bounded.
- [ ] Acceptance criteria map to tests.
- [ ] AI workbench and stage model profile is recorded.
- [ ] Plan is ready for the configured approval policy.
`;
}

function featureTestsTemplate(featureId, featureName, aiWorkbench = DEFAULT_AI_WORKBENCH) {
  return `# Tests: ${featureName}

\`\`\`yaml
artifact: tests
feature_id: ${featureId}
feature_name: ${JSON.stringify(featureName)}
state: draft
owner_role: Planner Agent
source_requirements: requirements.md
source_plan: plan.md
created: ${today()}
updated: ${today()}
\`\`\`

## Test Strategy

Describe how this feature will be validated.

## AI Workbench And Models

Use the configured testing model for normal test generation. Use \`highRiskReview\` for security-sensitive test design.

| Stage | Workbench | Model |
| --- | --- | --- |
${aiWorkbenchRows(aiWorkbench)}

## Acceptance Criteria Traceability

| Acceptance Criterion | Test Name Or Method | Level | Notes |
| --- | --- | --- | --- |
| <AC> | <test> | <unit/integration/e2e/manual> | <notes> |

## Test Matrix

| Requirement Or Risk | Test Type | Expected Result | Automation |
| --- | --- | --- | --- |
| <requirement> | <type> | <expected> | <yes/no> |

## Validation Commands

\`\`\`bash
# Replace with commands from this repository.
<command>
\`\`\`

## Validation Evidence

| Date | Command Or Method | Result | Notes |
| --- | --- | --- | --- |
| <date> | <command> | <pass/fail/not run> | <notes> |

## Known Gaps

| Gap | Risk | Owner | Follow-Up |
| --- | --- | --- | --- |
| <gap> | <risk> | <owner> | <follow-up> |
`;
}

function featureReviewTemplate(featureId, featureName, aiWorkbench = DEFAULT_AI_WORKBENCH) {
  return `# Review: ${featureName}

\`\`\`yaml
artifact: review
feature_id: ${featureId}
feature_name: ${JSON.stringify(featureName)}
state: not_started
owner_role: Reviewer Agent
created: ${today()}
updated: ${today()}
\`\`\`

## Review Scope

- Requirements:
- Plan:
- Diff:

## AI Workbench And Models

- [ ] Review used the configured \`reviewing\` model.
- [ ] High-risk work used the configured \`highRiskReview\` model for final review.

| Stage | Workbench | Model |
| --- | --- | --- |
${aiWorkbenchRows(aiWorkbench)}

## Pull Request Model Usage Summary

| Stage | Workbench | Model | Notes |
| --- | --- | --- | --- |
| <stage> | <workbench> | <model> | <notes> |

## Findings By Severity

| Severity | Finding | Required Fix | Status |
| --- | --- | --- | --- |
| <P0-P3> | <finding> | <fix> | <status> |

## Requirements Alignment

- <notes>

## Plan Alignment

- <notes>

## Security

- <notes>

## Accessibility

- <notes>

## Testing

- <notes>

## Fixes Applied

- <fix>

## Remaining Risks

- <risk>
`;
}

function featureApprovalTemplate(featureId, featureName, approvalPolicy = DEFAULT_APPROVAL_POLICY) {
  const policy = normalizeApprovalPolicy(approvalPolicy);
  return `# Approval: ${featureName}

\`\`\`yaml
artifact: approval
feature_id: ${featureId}
feature_name: ${JSON.stringify(featureName)}
created: ${today()}
updated: ${today()}
\`\`\`

## Approval Policy

Policy is copied from \`.ai/config.json\` when the feature is created. \`human_required\` gates need explicit human approval. \`not_required\` gates can advance automatically after the required artifact or evidence exists. Once a gate is satisfied, state advances immediately: requirements to \`plan_draft\`, plan to \`building\`, and implementation to \`complete\`.

| Gate | Required | Status |
| --- | --- | --- |
${approvalPolicyRows(policy)}

## Requirements Approval

Status: ${approvalStatusLabel(policy, "requirements")}
Approved by:
Approved at:
Source:
Approved artifact: requirements.md
Artifact version or hash:
Notes:

## Plan Approval

Status: ${approvalStatusLabel(policy, "plan")}
Approved by:
Approved at:
Source:
Approved artifact: plan.md
Artifact version or hash:
Notes:

## Implementation Approval

Status: ${approvalStatusLabel(policy, "implementation")}
Approved by:
Approved at:
Source:
Reviewed evidence:
Accepted gaps:
Notes:

## Approval History

| Date | Gate | Action | Actor | Source | Notes |
| --- | --- | --- | --- | --- | --- |
`;
}

function featureMemoryTemplate(featureId, featureName) {
  return `# Memory: ${featureName}

\`\`\`yaml
artifact: feature-memory
feature_id: ${featureId}
feature_name: ${JSON.stringify(featureName)}
created: ${today()}
updated: ${today()}
\`\`\`

## Stable Assumptions

- <assumption>

## Resolved Decisions

| Decision | Rationale | Date |
| --- | --- | --- |
| <decision> | <rationale> | <date> |

## Rejected Options

- <option and reason>

## Follow-Up Ideas Outside Scope

- <idea>
`;
}

function featureActivityTemplate(featureId, featureName) {
  return `# Activity: ${featureName}

\`\`\`yaml
artifact: activity
feature_id: ${featureId}
feature_name: ${JSON.stringify(featureName)}
created: ${today()}
updated: ${today()}
\`\`\`

| Date | Actor | Command Or Action | State | Notes |
| --- | --- | --- | --- | --- |
| ${now()} | ai-delivery | /start-feature | requirements_draft | Created V2 feature lifecycle artifacts. |
`;
}

function featureHandoffTemplate(featureId, featureName) {
  return `# Handoff: ${featureName}

\`\`\`yaml
artifact: handoff
feature_id: ${featureId}
feature_name: ${JSON.stringify(featureName)}
created: ${today()}
updated: ${today()}
\`\`\`

## Current State

requirements_draft

## Current Role

Requirements Agent

## Next Allowed Command

/status or continue requirements drafting

## Artifacts Updated

- state.json
- requirements.md
- plan.md
- tests.md
- review.md
- approval.md
- memory.md
- activity.md
- handoff.md

## Open Questions

- <question>

## Risks

- <risk>

## Validation Evidence

- Not applicable yet.
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
  const legacyConfig = readJson(path.join(target, ".ai-delivery.json"), {});
  const aiPath = legacyConfig.aiPath || DEFAULT_AI_PATH;
  const aiConfig = readJson(path.join(target, aiPath, "config.json"), {});
  return buildProjectConfig({ ...legacyConfig, ...aiConfig });
}

function readJson(filePath, fallback) {
  if (!fs.existsSync(filePath)) return fallback;
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function checkAiWorkbench(aiWorkbench) {
  const workbench = normalizeAiWorkbench(aiWorkbench);
  const checks = [
    {
      ok: aiWorkbench && typeof aiWorkbench === "object" && !Array.isArray(aiWorkbench),
      label: "V2 config AI workbench",
      detail: ".ai/config.json aiWorkbench"
    },
    {
      ok: WORKBENCH_CHOICES.some((choice) => choice.key === workbench.provider),
      label: "AI workbench provider is supported",
      detail: workbench.provider
    }
  ];

  for (const field of STAGE_MODEL_FIELDS) {
    checks.push({
      ok: Boolean(workbench.stageModels[field.key]),
      label: `AI workbench model for ${field.key}`,
      detail: ".ai/config.json aiWorkbench.stageModels"
    });
  }

  return checks;
}

function checkExists(filePath, label) {
  return {
    ok: fs.existsSync(filePath),
    label,
    detail: filePath
  };
}

function checkFileContains(filePath, expectedText, label) {
  return {
    ok: fs.existsSync(filePath) && fs.readFileSync(filePath, "utf8").includes(expectedText),
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

function normalizeDocsPath(value, aiPath = DEFAULT_AI_PATH) {
  const docsPath = normalizeRelative(value || DEFAULT_DOCS_PATH);
  const aiDocsPath = path.posix.join(aiPath || DEFAULT_AI_PATH, "docs");
  if (docsPath === aiDocsPath || docsPath === path.posix.join(DEFAULT_AI_PATH, "docs")) {
    return DEFAULT_DOCS_PATH;
  }
  return docsPath;
}

function normalizeFeaturePath(value, docsPath, aiPath = DEFAULT_AI_PATH) {
  const featurePath = normalizeRelative(value || path.posix.join(docsPath, "features"));
  const defaultDocsFeaturePath = path.posix.join(docsPath, "features");
  const aiFeaturePath = path.posix.join(aiPath || DEFAULT_AI_PATH, "features");
  const aiDocsFeaturePath = path.posix.join(aiPath || DEFAULT_AI_PATH, "docs", "features");

  if (
    featurePath === aiFeaturePath ||
    featurePath === aiDocsFeaturePath ||
    featurePath === path.posix.join(DEFAULT_AI_PATH, "features") ||
    featurePath === path.posix.join(DEFAULT_AI_PATH, "docs", "features")
  ) {
    return defaultDocsFeaturePath;
  }

  return featurePath;
}

function normalizeDocsChildPath(value, docsPath, aiPath, child) {
  const childPath = normalizeRelative(value || path.posix.join(docsPath, child));
  const defaultDocsChildPath = path.posix.join(docsPath, child);
  const aiDocsChildPath = path.posix.join(aiPath || DEFAULT_AI_PATH, "docs", child);

  if (childPath === aiDocsChildPath || childPath === path.posix.join(DEFAULT_AI_PATH, "docs", child)) {
    return defaultDocsChildPath;
  }

  return childPath;
}

function normalizeRelative(value) {
  const normalized = value.replaceAll("\\", "/").replace(/^\/+/, "");
  if (!normalized || normalized.includes("..")) {
    fail(`Path must be a relative path without '..': ${value}`);
  }
  return normalized;
}

function featureDirectoryName(featureId, featureName) {
  return `${featureId}-${slugify(featureName)}`;
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

function now() {
  return new Date().toISOString();
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
  ${cli} loop <command> [options]
  ${cli} doctor [target]

Commands:
  default    With no command, initialize the current directory.
  init       Install/sync standards, create AI delivery artifacts, and seed the first feature.
  sync       Sync this standards bundle into a product repository and seed AGENTS.md if missing.
  feature    Create a feature artifact folder from the required templates.
  loop       Run resumable standards-driven agent loops.
  doctor     Check whether a repository has the expected AI delivery setup.

Options:
  --standards-path <path>  Standards bundle path in the target repo. Default: .ai/ai-delivery-standards
  --docs-path <path>       Product docs path. Default: .ai
  --ai-path <path>         AI operating-system path. Default: .ai
  --feature-root <path>    V2 feature lifecycle root. Default: .ai/features
  --feature-id <id>        Initial feature ID for init. Default: FEA-001
  --feature-name <name>    Initial feature name for init. Default: Initial Product Skeleton
  --approval-policy <mode> Set all gates to human_required or not_required.
  --autonomous-after-requirements
                           Require human requirements approval, then automate plan and implementation gates.
  --requirements-approval <mode>
                           Set requirements gate policy.
  --plan-approval <mode>   Set plan gate policy.
  --implementation-approval <mode>
                           Set implementation gate policy.
  --target <path>          Target repo for feature command. Default: .
  --force                  Overwrite generated product docs, config, or feature artifacts.
  --dry-run                Print planned writes without changing files.

Examples:
  ${cli}
  ${cli} --dry-run
  ${cli} init ../my-product --feature-name "Initial Product Skeleton"
  ${cli} init ../my-product --ai-path .ai
  ${cli} init ../my-product --requirements-approval not_required
  ${cli} init ../my-product --autonomous-after-requirements
  ${cli} init ../my-product --approval-policy not_required
  ${cli} feature FEA-042 "Scoped Help Assistant" --target ../my-product
  ${cli} loop init --target ../my-product --spec SPEC.md --standards AI_STANDARDS.md
  ${cli} loop run --target ../my-product
  ${cli} sync ../my-product
  ${cli} doctor ../my-product
`);
}
