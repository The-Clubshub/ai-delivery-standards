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
const DEFAULT_DOCS_PATH = "docs";
const APPROVAL_GATES = ["requirements", "plan", "implementation"];
const APPROVAL_GATE_LABELS = {
  requirements: "Requirements",
  plan: "Plan",
  implementation: "Implementation"
};
const APPROVAL_GATE_TRANSITIONS = {
  requirements: "requirements_pending_review -> requirements_approved",
  plan: "plan_pending_review -> plan_approved",
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
    boolean: ["force", "dry-run", "autonomous-after-requirements"],
    string: [
      "standards-path",
      "docs-path",
      "ai-path",
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
  const aiPath = normalizeRelative(options["ai-path"] || existingConfig.aiPath || DEFAULT_AI_PATH);
  const standardsPath = normalizeRelative(options["standards-path"] || existingConfig.standardsPath || "ai-delivery-standards");
  const docsPath = normalizeDocsPath(options["docs-path"] || existingConfig.docsPath, aiPath);
  const agentInstructionPath = DEFAULT_AGENT_INSTRUCTION_PATH;
  const featureId = options["feature-id"] || "FEA-001";
  const featureName = options["feature-name"] || "Initial Product Skeleton";
  const dryRun = Boolean(options["dry-run"]);
  const approvalPolicy = resolveApprovalPolicyOptions(existingConfig.approvalPolicy, options);

  ensureDirectory(target, dryRun);
  syncStandards([
    target,
    "--standards-path",
    standardsPath,
    "--skip-agent",
    ...(dryRun ? ["--dry-run"] : [])
  ]);

  const configPath = path.join(target, ".ai-delivery.json");
  const config = buildProjectConfig({ ...existingConfig, standardsPath, docsPath, aiPath, agentInstructionPath, approvalPolicy });
  writeText(configPath, `${JSON.stringify(config, null, 2)}\n`, { dryRun, overwrite: options.force });

  ensureAiOperatingSystem(target, config, { dryRun, overwrite: options.force });
  ensureAgentInstructions(target, config, { dryRun, overwrite: options.force });

  const aiDeliveryDoc = path.join(target, docsPath, "ai-delivery.md");
  writeText(aiDeliveryDoc, productAiDeliveryTemplate(config), { dryRun, overwrite: options.force });

  const architectureDoc = path.join(target, docsPath, "architecture", "overview.md");
  writeText(architectureDoc, architectureOverviewTemplate(), { dryRun, overwrite: options.force });

  createFeature([
    featureId,
    featureName,
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
  const featureFolder = path.join(target, featureRoot, featureId);
  const dryRun = Boolean(options["dry-run"]);

  ensureDirectory(featureFolder, dryRun);
  ensureDirectory(path.join(featureFolder, "artifacts"), dryRun);
  ensureDirectory(path.join(featureFolder, "artifacts", "screenshots"), dryRun);
  ensureDirectory(path.join(featureFolder, "artifacts", "logs"), dryRun);
  ensureDirectory(path.join(featureFolder, "artifacts", "evals"), dryRun);
  ensureDirectory(path.join(featureFolder, "artifacts", "exports"), dryRun);

  writeJson(path.join(featureFolder, "state.json"), featureStateTemplate(featureId, featureName, featureConfig.approvalPolicy), { dryRun, overwrite: options.force });
  writeText(path.join(featureFolder, "requirements.md"), featureRequirementsTemplate(featureId, featureName), { dryRun, overwrite: options.force });
  writeText(path.join(featureFolder, "plan.md"), featurePlanTemplate(featureId, featureName, featureConfig.approvalPolicy), { dryRun, overwrite: options.force });
  writeText(path.join(featureFolder, "tests.md"), featureTestsTemplate(featureId, featureName), { dryRun, overwrite: options.force });
  writeText(path.join(featureFolder, "review.md"), featureReviewTemplate(featureId, featureName), { dryRun, overwrite: options.force });
  writeText(path.join(featureFolder, "approval.md"), featureApprovalTemplate(featureId, featureName, featureConfig.approvalPolicy), { dryRun, overwrite: options.force });
  writeText(path.join(featureFolder, "memory.md"), featureMemoryTemplate(featureId, featureName), { dryRun, overwrite: options.force });
  writeText(path.join(featureFolder, "activity.md"), featureActivityTemplate(featureId, featureName), { dryRun, overwrite: options.force });
  writeText(path.join(featureFolder, "handoff.md"), featureHandoffTemplate(featureId, featureName), { dryRun, overwrite: options.force });

  updateFeatureRegistry(target, featureConfig, featureId, featureName, { dryRun });
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
  const standardsPath = path.join(target, config.standardsPath || "ai-delivery-standards");
  const docsPath = path.join(target, config.docsPath || DEFAULT_DOCS_PATH);
  const aiPath = path.join(target, config.aiPath || DEFAULT_AI_PATH);
  const featureRoot = path.join(target, config.featurePath || path.posix.join(config.docsPath || DEFAULT_DOCS_PATH, "features"));
  const agentInstructionPath = DEFAULT_AGENT_INSTRUCTION_PATH;
  const checks = [];

  checks.push(checkExists(path.join(target, ".ai-delivery.json"), "config .ai-delivery.json"));
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
  checks.push(checkExists(path.join(standardsPath, "templates", "v2", "feature", "requirements.md"), "V2 requirements template"));
  checks.push(checkExists(path.join(standardsPath, "standards", "accessibility.md"), "accessibility standards"));
  checks.push(checkExists(path.join(docsPath, "ai-delivery.md"), "product AI delivery guide"));
  checks.push(checkExists(path.join(docsPath, "architecture", "overview.md"), "architecture overview"));

  const featureFolders = fs.existsSync(featureRoot)
    ? fs.readdirSync(featureRoot, { withFileTypes: true }).filter((entry) => entry.isDirectory())
    : [];
  checks.push({
    ok: featureFolders.length > 0,
    label: "at least one V2 feature artifact folder",
    detail: featureRoot
  });
  if (featureFolders.length > 0) {
    const firstFeature = path.join(featureRoot, featureFolders[0].name);
    for (const file of V2_FEATURE_ARTIFACTS) {
      checks.push(checkExists(path.join(firstFeature, file), `V2 feature artifact ${file}`));
    }
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

  writeJson(path.join(aiPath, "config.json"), aiConfigTemplate(config), { dryRun: options.dryRun, overwrite: options.overwrite });
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
  const standardsPath = normalizeRelative(overrides.standardsPath || "ai-delivery-standards");
  const docsPath = normalizeDocsPath(overrides.docsPath, aiPath);
  const featurePath = normalizeFeaturePath(overrides.featurePath, docsPath, aiPath);
  const legacyFeaturePath = normalizeDocsChildPath(overrides.legacyFeaturePath, docsPath, aiPath, "features");
  const approvalPolicy = normalizeApprovalPolicy(overrides.approvalPolicy);

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

function updateFeatureRegistry(target, config, featureId, featureName, options = {}) {
  const registryPath = path.join(target, config.aiPath, "registry.json");
  const registry = readJson(registryPath, featureRegistryTemplate());
  const features = Array.isArray(registry.features) ? registry.features : [];
  const existingIndex = features.findIndex((feature) => feature.id === featureId);
  const entry = {
    id: featureId,
    title: featureName,
    path: path.posix.join(config.featurePath, featureId),
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

This repository uses \`ai-delivery-standards\` V2 as its AI project operating system.

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
4. The active feature state and approvals under \`${config.featurePath}/<ID>/\`.
5. Feature, bug, refactor, architecture, and product docs in this repository.
6. Vendored \`ai-delivery-standards\` guidance.
6. General model defaults or habits.

If a request conflicts with the state machine, the state machine wins. Stop and explain the next allowed action.

## Boot Sequence

Before acting, every agent must read:

1. \`AGENTS.md\`
2. \`${config.aiPath}/config.json\`
3. \`${config.aiPath}/registry.json\`
4. \`${config.aiPath}/state.json\`
5. The active feature \`${config.featurePath}/<ID>/state.json\`
6. The active feature \`${config.featurePath}/<ID>/approval.md\`
7. The relevant role definition in \`${config.standardsPath}/roles/\`
8. The lifecycle and command protocol:
   - \`${config.standardsPath}/workflows/lifecycle.md\`
   - \`${config.standardsPath}/commands/command-protocol.md\`
9. Relevant standards in \`${config.standardsPath}/standards/\`

If the active feature cannot be identified, report \`/status\` and ask for a feature ID only if it cannot be inferred safely.

## Operating System Paths

| Purpose | Path |
| --- | --- |
| Project config | \`${config.aiPath}/config.json\` |
| Project state | \`${config.aiPath}/state.json\` |
| Feature registry | \`${config.aiPath}/registry.json\` |
| Project memory | \`${config.aiPath}/memory/\` |
| Feature artifacts | \`${config.featurePath}/<ID>/\` |
| Standards bundle | \`${config.standardsPath}/\` |
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

## Role Selection

State determines the primary role:

| State | Role |
| --- | --- |
| \`intake\`, \`requirements_draft\`, \`requirements_pending_review\` | Requirements Agent |
| \`requirements_approved\`, \`plan_draft\`, \`plan_pending_review\` | Planner Agent |
| \`plan_approved\`, \`building\` | Builder Agent |
| \`reviewing\` | Reviewer Agent |
| \`testing\` | Tester Agent |
| \`ready_for_human_review\`, \`complete\` | Sync Agent |
| \`blocked\` | Current role or Sync Agent |

## Required Feature Artifacts

Every feature must have:

\`\`\`text
${config.featurePath}/<ID>/
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

\`human_required\` means an explicit human approval must be recorded before the transition. \`not_required\` means the responsible agent may advance the gate after required artifacts or evidence are ready, recording \`not_required\` in \`${config.featurePath}/<ID>/approval.md\` and \`${config.featurePath}/<ID>/state.json\`.

Gate evidence must be recorded in \`${config.featurePath}/<ID>/approval.md\` and mirrored in \`${config.featurePath}/<ID>/state.json\`.

Agents may record human approval after it is given. Agents must never self-approve a \`human_required\` gate or infer approval from silence.

## Universal Commands

Use these commands in chat, CLI, issues, or PR comments:

- \`/start-feature\`
- \`/status\`
- \`/approve-requirements\`
- \`/approve-plan\`
- \`/build\`
- \`/review\`
- \`/test\`
- \`/continue\`
- \`/complete\`

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

The agent must refuse and explain the next allowed action when:

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
Use AGENTS.md and ai-delivery-standards V2.

Task: <describe task>

Before implementation:
1. Read AGENTS.md.
2. Read .ai/config.json, .ai/registry.json, and .ai/state.json.
3. Read the active feature state and approval files.
4. Determine the current role from the state machine.
5. Do not edit production code until requirements and plan gates are satisfied.

During implementation:
- Work only from approved plan operations.
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
| Feature lifecycle folders | \`${config.featurePath}/<ID>/\` |
| Standards bundle | \`${config.standardsPath}/\` |
| Architecture docs | \`${config.docsPath}/architecture/\` |

## Required Lifecycle

Every non-trivial feature must move through:

\`\`\`text
intake
-> requirements_draft
-> requirements_pending_review
-> requirements_approved
-> plan_draft
-> plan_pending_review
-> plan_approved
-> building
-> reviewing
-> testing
-> ready_for_human_review
-> complete
\`\`\`

The feature may enter \`blocked\` from any non-terminal state.

## Required Feature Artifacts

Every feature must include:

\`\`\`text
${config.featurePath}/<ID>/
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

\`human_required\` gates need explicit human approval. \`not_required\` gates can advance automatically after the required artifact or evidence exists. Gate evidence lives in \`${config.featurePath}/<ID>/approval.md\` and is mirrored in \`state.json\`.

## Standard Roles

- Requirements Agent
- Planner Agent
- Builder Agent
- Reviewer Agent
- Tester Agent
- Sync Agent

Role behavior is defined in \`${config.standardsPath}/roles/\`.

## Universal Commands

- \`/start-feature\`
- \`/status\`
- \`/approve-requirements\`
- \`/approve-plan\`
- \`/build\`
- \`/review\`
- \`/test\`
- \`/continue\`
- \`/complete\`

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

Use this file when a request contains multiple independent features.

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

function featurePlanTemplate(featureId, featureName, approvalPolicy = DEFAULT_APPROVAL_POLICY) {
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

## Implementation Rules

- Implement only approved scope from \`requirements.md\`.
- Work operation by operation.
- Update tests with the operation that changes behavior.
- Stop and return to the right draft state if the implementation needs to diverge.

## Operation Plan

| Step | Status | Operation | Files Or Modules | Tests | Notes |
| --- | --- | --- | --- | --- | --- |
| 1 | Not started | <operation> | <files> | <tests> | <notes> |

## Detailed Operations

### Operation 1: <name>

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
- [ ] Plan is ready for the configured approval policy.
`;
}

function featureTestsTemplate(featureId, featureName) {
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

function featureReviewTemplate(featureId, featureName) {
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
  --ai-path <path>         AI operating-system path. Default: .ai
  --feature-root <path>    V2 feature lifecycle root. Default: docs/features
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
  --force                  Overwrite generated product docs or feature artifacts.
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
  ${cli} sync ../my-product
  ${cli} doctor ../my-product
`);
}
