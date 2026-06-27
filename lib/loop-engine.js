const childProcess = require("child_process");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const LOOP_FILE_NAMES = {
  state: "STATE.json",
  tasks: "TASKS.md",
  report: "REPORT.md",
  decisions: "DECISIONS.md",
  verification: "VERIFICATION.json",
  review: "REVIEW.md",
  memory: "MEMORY.md",
  specSummary: "SPEC_SUMMARY.md",
  specSummaryJson: "SPEC_SUMMARY.json",
  standardsJson: "STANDARDS.json",
  standardsChecklist: "STANDARDS_CHECKLIST.md",
  builderPrompt: "BUILDER_PROMPT.md",
  reviewerPrompt: "REVIEWER_PROMPT.md",
  builderOutput: "BUILDER_OUTPUT.md",
  reviewerOutput: "REVIEWER_OUTPUT.md",
  activity: "ACTIVITY.md"
};

const STANDARD_CATEGORIES = [
  "quality",
  "model_routing",
  "ux",
  "security",
  "testing",
  "autonomy",
  "permission_boundaries",
  "deployment",
  "communication",
  "observability",
  "performance"
];

const CATEGORY_KEYWORDS = {
  quality: ["quality", "maintain", "architecture", "code", "review", "refactor", "error", "reliability"],
  model_routing: ["model routing", "ai provider", "ai_provider", "risk tier", "premium review", "requires_premium_review"],
  ux: ["ux", "ui", "user experience", "accessibility", "screen", "visual", "mobile", "frontend"],
  security: ["security", "auth", "authentication", "authorization", "privacy", "tenant", "secret", "token"],
  testing: ["test", "testing", "verify", "verification", "lint", "typecheck", "build", "smoke"],
  autonomy: ["autonomy", "autonomous", "agent", "loop", "iterate", "resume", "state"],
  permission_boundaries: ["permission", "approval", "human", "gate", "boundary", "forbidden", "never", "must not"],
  deployment: ["deploy", "release", "production", "rollback", "migration", "environment"],
  communication: ["communicate", "summary", "report", "handoff", "status", "explain", "ask"],
  observability: ["log", "metric", "trace", "monitor", "observability", "alert", "dashboard"],
  performance: ["performance", "latency", "speed", "budget", "load", "scale", "memory"]
};

const SPEC_FIELDS = [
  "goals",
  "users",
  "workflows",
  "screens",
  "dataModels",
  "integrations",
  "constraints",
  "acceptanceCriteria"
];

const SPEC_KEYWORDS = {
  goals: ["goal", "objective", "outcome", "problem", "purpose"],
  users: ["user", "actor", "persona", "customer", "admin"],
  workflows: ["workflow", "flow", "journey", "process", "operation"],
  screens: ["screen", "page", "view", "ui", "interface", "frontend"],
  dataModels: ["data", "model", "entity", "schema", "database", "record"],
  integrations: ["integration", "api", "external", "webhook", "service", "tool"],
  constraints: ["constraint", "non-functional", "security", "permission", "boundary", "limit"],
  acceptanceCriteria: ["acceptance", "criteria", "done", "pass", "success", "given"]
};

const ROUTED_CODEX_BUILDER_COMMAND = "codex exec {codexConfigArgs} -o {output} - < {prompt}";
const ROUTED_CODEX_REVIEWER_COMMAND = "codex exec {reviewerCodexConfigArgs} -o {output} - < {prompt}";

const HIGH_IMPACT_PATTERNS = [
  { category: "production deploy", pattern: /\b(prod|production)\b.*\b(deploy|release|publish)\b|\b(deploy|release|publish)\b.*\b(prod|production)\b/i },
  { category: "public message", pattern: /\b(send|publish|post)\b.*\b(email|sms|notification|tweet|message|public)\b/i },
  { category: "payment or spend", pattern: /\b(payment|charge|invoice|billing|stripe|paypal|spend|budget|purchase)\b/i },
  { category: "live trading", pattern: /\b(trade|brokerage|order|position|portfolio)\b/i },
  { category: "destructive data", pattern: /\b(delete|drop|truncate|purge|destroy|wipe)\b/i },
  { category: "auth or security", pattern: /\b(auth|oauth|permission|role|policy|secret|token|credential|security)\b/i },
  { category: "infrastructure apply", pattern: /\b(terraform apply|pulumi up|kubectl apply|helm upgrade)\b/i },
  { category: "git publishing", pattern: /\bgit\s+push\b|\bgh\s+pr\s+merge\b/i }
];

const PREMIUM_REVIEW_PATTERNS = [
  { category: "architecture", pattern: /\b(architecture|architectural|cross-cutting|boundary|boundaries|abstraction)\b/i },
  { category: "auth or permissions", pattern: /\b(auth|authentication|authorization|permission|permissions|role|roles|tenant|policy)\b/i },
  { category: "billing or payments", pattern: /\b(billing|payment|payments|invoice|refund|subscription|pricing|stripe|paypal|credit)\b/i },
  { category: "database or migrations", pattern: /\b(database|schema|migration|migrations|customer data|pii|personal data|tenant data)\b/i },
  { category: "security", pattern: /\b(security|secret|token|credential|encryption|audit|abuse|compliance)\b/i }
];

const RISK_TIER_STRENGTH = {
  other: 0,
  low_risk: 1,
  standard_implementation: 1,
  standard_review: 2,
  premium_review: 3
};

const MODEL_STRENGTH = {
  "low-risk": 1,
  "standard-implementation": 1,
  "standard-review": 2,
  "premium-review": 3
};

const GENERIC_MODEL_ROUTING = {
  product_strategy: {
    provider: "project-configured",
    model: "premium-review",
    risk_tier: "premium_review",
    strength_rank: 3,
    reason: "high-level reasoning and product judgement",
    requires_premium_review: true,
    reviewer_route: "product_strategy"
  },
  architecture: {
    provider: "project-configured",
    model: "premium-review",
    risk_tier: "premium_review",
    strength_rank: 3,
    reason: "structural decisions have high long-term cost",
    requires_premium_review: true,
    reviewer_route: "architecture"
  },
  database_schema: {
    provider: "project-configured",
    model: "premium-review",
    risk_tier: "premium_review",
    strength_rank: 3,
    reason: "schema and data mistakes are expensive to reverse",
    requires_premium_review: true,
    reviewer_route: "database_schema"
  },
  implementation: {
    provider: "project-configured",
    model: "standard-implementation",
    risk_tier: "standard_implementation",
    strength_rank: 1,
    reason: "cost-effective for bounded implementation",
    fallback_model: "premium-review",
    requires_premium_review: false,
    reviewer_route: "code_review"
  },
  refactoring: {
    provider: "project-configured",
    model: "standard-implementation",
    risk_tier: "standard_implementation",
    strength_rank: 1,
    reason: "good for repetitive code changes",
    fallback_model: "premium-review",
    requires_premium_review: false,
    reviewer_route: "code_review"
  },
  unit_tests: {
    provider: "project-configured",
    model: "standard-implementation",
    risk_tier: "standard_implementation",
    strength_rank: 1,
    reason: "cost-effective for standard test coverage",
    fallback_model: "premium-review",
    requires_premium_review: false,
    reviewer_route: "code_review"
  },
  edge_case_tests: {
    provider: "project-configured",
    model: "standard-review",
    risk_tier: "standard_review",
    strength_rank: 2,
    reason: "better reasoning around failure modes",
    requires_premium_review: false
  },
  code_review: {
    provider: "project-configured",
    model: "standard-review",
    risk_tier: "standard_review",
    strength_rank: 2,
    reason: "final quality gate",
    requires_premium_review: false
  },
  security_review: {
    provider: "project-configured",
    model: "premium-review",
    risk_tier: "premium_review",
    strength_rank: 3,
    reason: "security-sensitive work must use the strongest configured reviewer",
    requires_premium_review: true,
    reviewer_route: "security_review"
  },
  auth_billing_payments: {
    provider: "project-configured",
    model: "premium-review",
    risk_tier: "premium_review",
    strength_rank: 3,
    reason: "high-risk business-critical code",
    requires_premium_review: true,
    reviewer_route: "auth_billing_payments"
  },
  documentation: {
    provider: "project-configured",
    model: "low-risk",
    risk_tier: "low_risk",
    strength_rank: 1,
    reason: "low-risk text generation",
    fallback_model: "standard-review",
    requires_premium_review: false
  },
  marketing_copy: {
    provider: "project-configured",
    model: "premium-review",
    risk_tier: "premium_review",
    strength_rank: 3,
    reason: "high-visibility copy needs strongest configured judgement",
    requires_premium_review: true,
    reviewer_route: "marketing_copy"
  }
};

const LOCAL_SAFE_COMMAND_PATTERNS = [
  /^npm\s+(run\s+)?(test|lint|build|check|typecheck)\b/,
  /^pnpm\s+(run\s+)?(test|lint|build|check|typecheck)\b/,
  /^yarn\s+(run\s+)?(test|lint|build|check|typecheck)\b/,
  /^node\s+--check\b/,
  /^node\s+[\w./-]+\.js\b/,
  /^npx\s+.*\b(test|lint|build|check|typecheck|playwright)\b/,
  /^go\s+test\b/,
  /^cargo\s+test\b/,
  /^pytest\b/,
  /^python\s+-m\s+pytest\b/
];

function handleLoopCommand(argv, runtime = {}) {
  const subcommand = argv[0] || "status";
  const rest = argv.slice(1);
  const fail = runtime.fail || defaultFail;

  switch (subcommand) {
    case "init":
    case "new":
    case "create":
      return initLoop(rest, runtime);
    case "run":
    case "start":
    case "resume":
    case "continue":
      return runLoop(rest, runtime, subcommand);
    case "status":
      return printLoopStatus(rest, runtime);
    case "tasks":
      return printLoopTasks(rest, runtime);
    case "verify":
      return verifyLoopCommand(rest, runtime);
    case "review":
      return reviewLoopCommand(rest, runtime);
    case "results":
    case "verification":
      return printVerificationResults(rest, runtime);
    case "approve":
      return approveLoop(rest, runtime);
    case "reject":
      return rejectLoop(rest, runtime);
    case "pause":
      return pauseLoop(rest, runtime);
    case "report":
      return printLoopReport(rest, runtime);
    case "help":
    case "--help":
    case "-h":
      return printLoopHelp(runtime);
    default:
      fail(`Unknown loop command: ${subcommand}\n\nRun: ${runtime.commandName ? runtime.commandName() : "ai-delivery"} loop help`);
  }
}

function initLoop(argv, runtime) {
  const options = parseLoopArgs(argv, {
    boolean: ["force", "dry-run", "routed-codex"],
    string: ["target", "spec", "standards", "id", "name", "autonomy-tier", "builder-command", "reviewer-command"],
    array: ["verify"]
  });
  const fail = runtime.fail || defaultFail;
  const target = path.resolve(options.target || ".");
  const dryRun = Boolean(options["dry-run"]);
  const specPath = resolveExistingInput(target, options.spec, ["SPEC.md", "spec.md", "PRODUCT_SPEC.md"]);
  const standardsPath = resolveExistingInput(target, options.standards, ["AI_STANDARDS.md", "AGENTS.md", ".ai/ai-delivery.md"]);

  if (!specPath) {
    fail("Loop init needs a spec file. Pass --spec <path> or add SPEC.md to the target repo.");
  }
  if (!standardsPath) {
    fail("Loop init needs standards. Pass --standards <path> or add AI_STANDARDS.md to the target repo.");
  }

  const specMarkdown = fs.readFileSync(specPath, "utf8");
  const standardsMarkdown = fs.readFileSync(standardsPath, "utf8");
  const specSummary = normalizeSpec(specMarkdown, specPath);
  const standards = normalizeStandards(standardsMarkdown, standardsPath);
  const modelRouting = loadProjectModelRouting(target);
  const name = options.name || options.positionals.join(" ") || specSummary.title || "Agent Loop";
  const loopId = normalizeLoopId(options.id || `${todayCompact()}-${slugify(name)}`);
  const loopDir = path.join(target, ".ai", "loops", loopId);

  if (fs.existsSync(loopDir) && !options.force) {
    fail(`Loop already exists: ${loopDir}. Use --force to overwrite generated loop state.`);
  }

  const verificationCommands = normalizeArray(options.verify);
  const tasks = planTasks(specSummary, standards, verificationCommands, modelRouting);
  const state = createLoopState({
    loopId,
    name,
    target,
    loopDir,
    specPath,
    standardsPath,
    specSummary,
    standards,
    tasks,
    verificationCommands,
    autonomyTier: normalizeAutonomyTier(options["autonomy-tier"] || "1"),
    builderCommand: options["builder-command"] || (options["routed-codex"] ? ROUTED_CODEX_BUILDER_COMMAND : ""),
    reviewerCommand: options["reviewer-command"] || (options["routed-codex"] ? ROUTED_CODEX_REVIEWER_COMMAND : "")
  });

  writeLoopArtifacts(loopDir, state, specSummary, standards, emptyVerification(loopId), defaultReview(loopId), { dryRun, overwrite: Boolean(options.force) });
  writeCurrentLoop(target, loopId, loopDir, { dryRun });

  log(runtime, `${dryRun ? "Planned" : "Created"} loop ${loopId} in ${loopDir}`);
  log(runtime, `next - ${runtime.commandName ? runtime.commandName() : "ai-delivery"} loop run ${loopId} --target ${shellQuote(target)}`);
}

function runLoop(argv, runtime, subcommand) {
  const options = parseLoopArgs(argv, {
    boolean: ["after-build", "dry-run", "routed-codex"],
    string: ["target", "max-steps", "builder-command", "reviewer-command"],
    array: ["verify"]
  });
  const loop = loadLoopFromOptions(options, runtime);
  const dryRun = Boolean(options["dry-run"]);
  const maxSteps = Number(options["max-steps"] || 1);
  const state = loop.state;

  if (subcommand === "resume" && state.status === "paused") {
    state.status = "running";
    appendActivity(state, "engine", "resume", "Loop resumed.");
  }

  if (options["builder-command"]) state.agentCommands.builder = options["builder-command"];
  if (options["reviewer-command"]) state.agentCommands.reviewer = options["reviewer-command"];
  if (options["routed-codex"]) {
    state.agentCommands.builder = ROUTED_CODEX_BUILDER_COMMAND;
    state.agentCommands.reviewer = ROUTED_CODEX_REVIEWER_COMMAND;
  }
  if (options.verify) state.verification.commands = normalizeArray(options.verify);

  let steps = 0;
  while (steps < maxSteps) {
    steps += 1;
    const decision = runOneLoopStep(loop, state, options, runtime);
    if (decision.stop) break;
  }

  saveLoop(loop, state, { dryRun });
  printStatusSummary(state, runtime);
}

function runOneLoopStep(loop, state, options, runtime) {
  if (["complete", "blocked"].includes(state.status)) {
    return { stop: true };
  }

  if (state.status === "paused") {
    appendActivity(state, "engine", "pause", "Loop is paused. Run loop resume to continue.");
    return { stop: true };
  }

  if (state.pendingApproval && state.pendingApproval.status === "pending") {
    state.status = "awaiting_approval";
    state.stage = "decision_gate";
    appendActivity(state, "decision-gate", "awaiting approval", state.pendingApproval.reason);
    return { stop: true };
  }

  const task = nextRunnableTask(state);
  if (!task) {
    return finalizeLoop(loop, state, runtime);
  }

  state.currentTaskId = task.id;
  const impact = detectHighImpact(`${task.title}\n${task.objective}\n${task.passFailChecks.join("\n")}`);
  if (impact.length > 0 && !hasTaskApproval(task, "high_impact_action")) {
    state.status = "awaiting_approval";
    state.stage = "decision_gate";
    state.pendingApproval = {
      id: `APPROVAL-${Date.now()}`,
      type: "high_impact_action",
      taskId: task.id,
      status: "pending",
      reason: `Task may affect ${impact.map((item) => item.category).join(", ")}.`,
      createdAt: now()
    };
    appendDecision(state, "approval_required", state.pendingApproval.reason);
    return { stop: true };
  }

  if (task.status === "pending") {
    task.status = "builder_required";
    task.startedAt = task.startedAt || now();
    state.status = "waiting_for_builder";
    state.stage = "implementation";
    state.builderPrompt = buildBuilderPrompt(state, task);
    appendActivity(state, "builder-agent", "task prepared", `${task.id}: ${task.title}`);
  }

  if (state.agentCommands.builder && task.status === "builder_required") {
    const result = runExternalAgentCommand(state.agentCommands.builder, state, task, loop.loopDir, "builder", runtime);
    task.status = result.ok ? "implemented" : "blocked";
    task.lastBuilderRun = result.summary;
    appendActivity(state, "builder-agent", "external builder command", result.ok ? "Builder command completed." : "Builder command failed.");
    if (!result.ok) {
      state.status = "blocked";
      state.stage = "implementation";
      task.blockers.push("Builder command failed. See artifacts/logs.");
      return { stop: true };
    }
  }

  if (options["after-build"] && task.status === "builder_required") {
    task.status = "implemented";
    appendActivity(state, "builder-agent", "implementation marked ready", `${task.id} marked ready for verification.`);
  }

  if (task.status !== "implemented") {
    return { stop: true };
  }

  state.status = "verifying";
  state.stage = "verification";
  const verification = runVerifier(loop.target, loop.loopDir, state, task, runtime);
  state.lastVerificationStatus = verification.status;
  state.lastVerificationAt = verification.updatedAt;

  state.status = "reviewing";
  state.stage = "review";
  if (state.agentCommands.reviewer) {
    state.reviewerPrompt = buildExternalReviewerPrompt(state, task, verification);
    writeText(path.join(loop.loopDir, LOOP_FILE_NAMES.reviewerPrompt), state.reviewerPrompt, { dryRun: options.dryRun, overwrite: true });
    const result = runExternalAgentCommand(
      state.agentCommands.reviewer,
      state,
      task,
      loop.loopDir,
      "reviewer",
      runtime,
      {
        promptFile: LOOP_FILE_NAMES.reviewerPrompt,
        outputFile: LOOP_FILE_NAMES.reviewerOutput,
        activeRoute: task.ai_reviewer || task.ai_provider
      }
    );
    task.lastExternalReviewerRun = result.summary;
    appendActivity(state, "reviewer-agent", "external reviewer command", result.ok ? "Reviewer command completed." : "Reviewer command failed.");
    if (!result.ok) {
      task.status = "builder_required";
      state.status = "waiting_for_builder";
      state.stage = "review";
      task.blockers.push("Reviewer command failed. See artifacts/logs.");
      return { stop: true };
    }
  }
  const review = runReviewer(loop, state, task, verification, runtime);
  state.lastReviewStatus = review.status;
  state.lastReviewAt = review.updatedAt;

  const blockers = review.findings.filter((finding) => finding.severity === "blocker");
  if (blockers.length > 0) {
    task.status = "builder_required";
    task.blockers = blockers.map((finding) => finding.issue);
    state.status = "waiting_for_builder";
    state.stage = "implementation";
    appendDecision(state, "return_to_builder", `Returned ${task.id} to Builder with ${blockers.length} blocker(s).`);
    return { stop: true };
  }

  if (verification.status !== "pass") {
    task.status = "builder_required";
    task.blockers = [`Verification status is ${verification.status}.`];
    state.status = "waiting_for_builder";
    state.stage = "implementation";
    appendDecision(state, "return_to_builder", `Verification did not pass for ${task.id}.`);
    return { stop: true };
  }

  task.status = "complete";
  task.completedAt = now();
  task.blockers = [];
  state.status = "running";
  state.stage = "decision_gate";
  appendDecision(state, "continue", `${task.id} passed verification and review.`);
  return { stop: false };
}

function verifyLoopCommand(argv, runtime) {
  const options = parseLoopArgs(argv, {
    boolean: [],
    string: ["target"],
    array: ["verify"]
  });
  const loop = loadLoopFromOptions(options, runtime);
  if (options.verify) loop.state.verification.commands = normalizeArray(options.verify);
  const task = currentOrLastTask(loop.state);
  const verification = runVerifier(loop.target, loop.loopDir, loop.state, task, runtime);
  loop.state.lastVerificationStatus = verification.status;
  loop.state.lastVerificationAt = verification.updatedAt;
  saveLoop(loop, loop.state, {});
  log(runtime, `verification - ${verification.status}`);
}

function reviewLoopCommand(argv, runtime) {
  const options = parseLoopArgs(argv, {
    boolean: [],
    string: ["target"],
    array: []
  });
  const loop = loadLoopFromOptions(options, runtime);
  const task = currentOrLastTask(loop.state);
  const verification = readJson(path.join(loop.loopDir, LOOP_FILE_NAMES.verification), emptyVerification(loop.state.loopId));
  const review = runReviewer(loop, loop.state, task, verification, runtime);
  loop.state.lastReviewStatus = review.status;
  loop.state.lastReviewAt = review.updatedAt;
  saveLoop(loop, loop.state, {});
  log(runtime, `review - ${review.status}`);
}

function approveLoop(argv, runtime) {
  const options = parseLoopArgs(argv, {
    boolean: [],
    string: ["target", "gate", "actor", "notes"],
    array: []
  });
  const loop = loadLoopFromOptions(options, runtime);
  const state = loop.state;
  const gate = options.gate || (state.pendingApproval && state.pendingApproval.type) || "manual";
  const actor = options.actor || "human";
  const notes = options.notes || "";

  if (!state.pendingApproval && gate !== "manual") {
    runtime.fail ? runtime.fail(`No pending approval exists for gate ${gate}.`) : defaultFail(`No pending approval exists for gate ${gate}.`);
  }

  const approval = {
    gate,
    actor,
    notes,
    approvedAt: now(),
    taskId: state.pendingApproval ? state.pendingApproval.taskId : state.currentTaskId
  };
  state.approvals.push(approval);

  if (state.pendingApproval) {
    state.pendingApproval.status = "approved";
    state.pendingApproval.approvedBy = actor;
    state.pendingApproval.approvedAt = approval.approvedAt;
    const task = state.tasks.find((item) => item.id === state.pendingApproval.taskId);
    if (task) {
      task.approvals = task.approvals || [];
      task.approvals.push(approval);
    }
    state.pendingApproval = null;
    state.status = "running";
  }

  appendDecision(state, "approved", `${actor} approved ${gate}${notes ? `: ${notes}` : "."}`);
  saveLoop(loop, state, {});
  log(runtime, `approved - ${gate}`);
}

function rejectLoop(argv, runtime) {
  const options = parseLoopArgs(argv, {
    boolean: [],
    string: ["target", "gate", "actor", "notes"],
    array: []
  });
  const loop = loadLoopFromOptions(options, runtime);
  const state = loop.state;
  const gate = options.gate || (state.pendingApproval && state.pendingApproval.type) || "manual";
  const actor = options.actor || "human";
  const notes = options.notes || "Rejected by human.";

  if (state.pendingApproval) {
    state.pendingApproval.status = "rejected";
    state.pendingApproval.rejectedBy = actor;
    state.pendingApproval.rejectedAt = now();
  }
  state.status = "blocked";
  state.stage = "decision_gate";
  appendDecision(state, "rejected", `${actor} rejected ${gate}: ${notes}`);
  saveLoop(loop, state, {});
  log(runtime, `rejected - ${gate}`);
}

function pauseLoop(argv, runtime) {
  const options = parseLoopArgs(argv, {
    boolean: [],
    string: ["target", "reason"],
    array: []
  });
  const loop = loadLoopFromOptions(options, runtime);
  loop.state.status = "paused";
  loop.state.stage = "paused";
  appendActivity(loop.state, "engine", "pause", options.reason || "Paused by request.");
  saveLoop(loop, loop.state, {});
  log(runtime, `paused - ${loop.state.loopId}`);
}

function printLoopStatus(argv, runtime) {
  const options = parseLoopArgs(argv, {
    boolean: [],
    string: ["target"],
    array: []
  });
  const loop = loadLoopFromOptions(options, runtime);
  printStatusSummary(loop.state, runtime);
}

function printLoopTasks(argv, runtime) {
  const options = parseLoopArgs(argv, {
    boolean: [],
    string: ["target"],
    array: []
  });
  const loop = loadLoopFromOptions(options, runtime);
  for (const task of loop.state.tasks) {
    console.log(`${task.status.padEnd(16)} ${task.id} ${task.title}`);
  }
}

function printLoopReport(argv, runtime) {
  const options = parseLoopArgs(argv, {
    boolean: [],
    string: ["target"],
    array: []
  });
  const loop = loadLoopFromOptions(options, runtime);
  const reportPath = path.join(loop.loopDir, LOOP_FILE_NAMES.report);
  console.log(fs.readFileSync(reportPath, "utf8"));
}

function printVerificationResults(argv, runtime) {
  const options = parseLoopArgs(argv, {
    boolean: [],
    string: ["target"],
    array: []
  });
  const loop = loadLoopFromOptions(options, runtime);
  const verification = readJson(path.join(loop.loopDir, LOOP_FILE_NAMES.verification), emptyVerification(loop.state.loopId));
  console.log(JSON.stringify(verification, null, 2));
}

function createLoopState(input) {
  return {
    artifact: "loop-state",
    version: "1.0",
    loopId: input.loopId,
    name: input.name,
    status: "initialized",
    stage: "spec_intake",
    target: input.target,
    loopDir: input.loopDir,
    createdAt: now(),
    updatedAt: now(),
    spec: {
      sourcePath: input.specPath,
      hash: hashText(fs.readFileSync(input.specPath, "utf8")),
      summaryPath: LOOP_FILE_NAMES.specSummary,
      missingRequirements: input.specSummary.missingRequirements,
      ambiguousRequirements: input.specSummary.ambiguousRequirements
    },
    standards: {
      sourcePath: input.standardsPath,
      hash: hashText(fs.readFileSync(input.standardsPath, "utf8")),
      categories: input.standards.categories
    },
    autonomyTier: input.autonomyTier,
    safety: autonomyTierPolicy(input.autonomyTier),
    agentCommands: {
      builder: input.builderCommand,
      reviewer: input.reviewerCommand
    },
    currentTaskId: null,
    tasks: input.tasks,
    verification: {
      commands: input.verificationCommands,
      requireEvidence: true
    },
    pendingApproval: null,
    approvals: [],
    decisions: [],
    activity: [],
    memory: [],
    lastVerificationStatus: "not_run",
    lastReviewStatus: "not_run",
    files: LOOP_FILE_NAMES
  };
}

function normalizeStandards(markdown, sourcePath) {
  const sections = splitMarkdownSections(markdown);
  const categories = {};
  for (const category of STANDARD_CATEGORIES) {
    categories[category] = [];
  }

  const allCandidates = [];
  for (const section of sections) {
    const headingCategory = categorizeText(section.heading);
    const rules = extractRuleCandidates(section.content);
    for (const rule of rules) {
      const category = headingCategory || categorizeText(rule) || "quality";
      const normalized = {
        id: `${category.toUpperCase().replace(/[^A-Z0-9]+/g, "_")}-${String(categories[category].length + 1).padStart(3, "0")}`,
        category,
        rule,
        sourceHeading: section.heading || "Document"
      };
      categories[category].push(normalized);
      allCandidates.push(normalized);
    }
  }

  if (allCandidates.length === 0) {
    const fallbackRule = "Follow the supplied AI Standards document and record any missing enforceable rules as blockers.";
    categories.quality.push({
      id: "QUALITY-001",
      category: "quality",
      rule: fallbackRule,
      sourceHeading: "Fallback"
    });
  }

  return {
    artifact: "normalized-standards",
    sourcePath,
    generatedAt: now(),
    categories,
    checklist: buildStandardsChecklist(categories)
  };
}

function normalizeSpec(markdown, sourcePath) {
  const sections = splitMarkdownSections(markdown);
  const title = firstHeading(markdown) || path.basename(sourcePath, path.extname(sourcePath));
  const summary = {
    artifact: "spec-summary",
    title,
    sourcePath,
    generatedAt: now(),
    goals: [],
    users: [],
    workflows: [],
    screens: [],
    dataModels: [],
    integrations: [],
    constraints: [],
    acceptanceCriteria: [],
    missingRequirements: [],
    ambiguousRequirements: [],
    sourceSections: sections.map((section) => section.heading).filter(Boolean)
  };

  for (const section of sections) {
    const field = specFieldFor(section.heading);
    const items = extractRuleCandidates(section.content);
    if (field) {
      summary[field].push(...items);
      continue;
    }

    for (const item of items) {
      const inferredField = specFieldFor(item);
      if (inferredField) summary[inferredField].push(item);
    }
  }

  if (summary.acceptanceCriteria.length === 0) {
    const inferred = extractAcceptanceSentences(markdown);
    summary.acceptanceCriteria.push(...inferred);
  }

  for (const field of SPEC_FIELDS) {
    summary[field] = unique(summary[field]).slice(0, 40);
    if (summary[field].length === 0 && field !== "screens" && field !== "integrations" && field !== "dataModels") {
      summary.missingRequirements.push(field);
    }
  }

  summary.ambiguousRequirements = unique(markdown
    .split(/\r?\n/)
    .filter((line) => /\?|todo|tbd|unknown|unclear|not sure|<[^>]+>/i.test(line))
    .map((line) => stripMarkdownPrefix(line))
    .filter(Boolean)
  ).slice(0, 30);

  return summary;
}

function loadProjectModelRouting(target) {
  const rootConfig = readJson(path.join(target, ".ai-delivery.json"), {});
  const aiPath = typeof rootConfig.aiPath === "string" && rootConfig.aiPath ? rootConfig.aiPath : ".ai";
  const aiConfig = readJson(path.join(target, aiPath, "config.json"), {});
  const modelRouting = aiConfig.modelRouting || rootConfig.modelRouting || {};
  return modelRouting && typeof modelRouting === "object" && !Array.isArray(modelRouting)
    ? modelRouting
    : {};
}

function modelRoute(modelRouting, routeKey) {
  const projectRoute = modelRouting && typeof modelRouting === "object" ? modelRouting[routeKey] : null;
  const route = projectRoute && typeof projectRoute === "object" && !Array.isArray(projectRoute)
    ? projectRoute
    : GENERIC_MODEL_ROUTING[routeKey] || GENERIC_MODEL_ROUTING.implementation;
  return { ...route, route_key: route.route_key || routeKey };
}

function routeStrength(route = {}) {
  if (Number.isFinite(route.strength_rank)) return route.strength_rank;
  if (typeof route.strength_rank === "number") return route.strength_rank;
  if (typeof route.strength_rank === "string" && route.strength_rank.trim() !== "") {
    const numeric = Number(route.strength_rank);
    if (Number.isFinite(numeric)) return numeric;
  }
  if (route.risk_tier && RISK_TIER_STRENGTH[route.risk_tier] !== undefined) {
    return RISK_TIER_STRENGTH[route.risk_tier];
  }
  return MODEL_STRENGTH[route.model] || 0;
}

function routeIsPremiumReview(route = {}) {
  return route.requires_premium_review === true || routeStrength(route) >= RISK_TIER_STRENGTH.premium_review;
}

function planTasks(specSummary, standards, verificationCommands, modelRouting = {}) {
  const tasks = [];
  const addTask = (title, sourceItems, options = {}) => {
    const id = `TASK-${String(tasks.length + 1).padStart(3, "0")}`;
    const standardsCategories = options.standardsCategories || suggestedStandardsCategories(title, standards);
    const aiProvider = options.ai_provider || routeAiProvider(title, sourceItems, standardsCategories, options.risk || "medium", modelRouting);
    tasks.push({
      id,
      title,
      status: "pending",
      objective: options.objective || sourceItems[0] || title,
      sourceItems: sourceItems.slice(0, 12),
      dependencies: options.dependencies || (tasks.length > 0 ? [tasks[tasks.length - 1].id] : []),
      risk: options.risk || "medium",
      standardsCategories,
      ai_provider: aiProvider,
      ai_reviewer: routeAiReviewer(aiProvider, modelRouting),
      passFailChecks: buildPassFailChecks(title, sourceItems, verificationCommands),
      verificationCommands,
      approvals: [],
      blockers: []
    });
  };

  addTask("Load standards, spec, and project context", [
    `Standards categories loaded: ${Object.keys(standards.categories).filter((key) => standards.categories[key].length > 0).join(", ") || "none"}`,
    `Spec source: ${specSummary.sourcePath}`
  ], { risk: "low", standardsCategories: ["quality", "communication", "autonomy"], dependencies: [] });

  if (specSummary.dataModels.length > 0) {
    addTask("Define data model and persistence boundaries", specSummary.dataModels, { risk: "high", standardsCategories: ["quality", "security", "testing"] });
  }
  if (specSummary.integrations.length > 0) {
    addTask("Wire external integrations and failure handling", specSummary.integrations, { risk: "high", standardsCategories: ["security", "observability", "testing"] });
  }
  if (specSummary.workflows.length > 0) {
    addTask("Implement primary workflows", specSummary.workflows, { risk: "high", standardsCategories: ["quality", "ux", "testing"] });
  }
  if (specSummary.screens.length > 0) {
    addTask("Build interface screens and interaction states", specSummary.screens, { risk: "medium", standardsCategories: ["ux", "accessibility", "testing"] });
  }

  const acceptanceSource = specSummary.acceptanceCriteria.length > 0
    ? specSummary.acceptanceCriteria
    : specSummary.goals.length > 0
      ? specSummary.goals
      : ["Implement the requested product/task specification."];
  addTask("Satisfy acceptance criteria", acceptanceSource, { risk: "high", standardsCategories: ["quality", "testing", "communication"] });
  addTask("Verify, review, and close the loop report", [
    "Run objective verification.",
    "Review against spec, standards, task checklist, safety, and permission boundaries.",
    "Persist state and final report."
  ], { risk: "medium", standardsCategories: ["testing", "communication", "permission_boundaries"] });

  return tasks;
}

function routeAiProvider(title, sourceItems, standardsCategories, risk, modelRouting = {}) {
  const text = `${title}\n${sourceItems.join("\n")}\n${standardsCategories.join("\n")}\n${risk}`;
  const premiumTriggers = detectPremiumReview(text);
  if (/\b(review|quality gate|close the loop)\b/i.test(title)) {
    return modelRoute(modelRouting, "code_review");
  }
  if (premiumTriggers.some((item) => item.category === "database or migrations")) {
    return modelRoute(modelRouting, "database_schema");
  }
  if (premiumTriggers.some((item) => item.category === "auth or permissions" || item.category === "billing or payments")) {
    return modelRoute(modelRouting, "auth_billing_payments");
  }
  if (premiumTriggers.some((item) => item.category === "security")) {
    return modelRoute(modelRouting, "security_review");
  }
  if (premiumTriggers.some((item) => item.category === "architecture") || /\b(strategy|plan|planning|context)\b/i.test(title)) {
    return modelRoute(modelRouting, "architecture");
  }
  if (/\b(edge|failure|negative|ambiguous)\b/i.test(text)) {
    return modelRoute(modelRouting, "edge_case_tests");
  }
  if (/\b(refactor|mechanical refactor|move module|move file)\b/i.test(text)) {
    return modelRoute(modelRouting, "refactoring");
  }
  if (/\b(test|unit)\b/i.test(text)) {
    return modelRoute(modelRouting, "unit_tests");
  }
  if (/\b(marketing|positioning|launch|copy)\b/i.test(text)) {
    return modelRoute(modelRouting, "marketing_copy");
  }
  if (/\b(document|docs|readme)\b/i.test(text)) {
    return modelRoute(modelRouting, "documentation");
  }
  return modelRoute(modelRouting, "implementation");
}

function routeAiReviewer(aiProvider, modelRouting = {}) {
  if (!aiProvider) return null;
  if (aiProvider.route_key === "code_review") {
    return null;
  }

  if (aiProvider.requires_premium_review) {
    return modelRoute(modelRouting, aiProvider.reviewer_route || "security_review");
  }

  const reviewerRoute = aiProvider.reviewer_route || "code_review";
  const reviewer = modelRoute(modelRouting, reviewerRoute);
  if (routeStrength(reviewer) >= routeStrength(aiProvider)) {
    return reviewer;
  }
  return null;
}

function detectPremiumReview(text) {
  return PREMIUM_REVIEW_PATTERNS.filter((item) => item.pattern.test(text));
}

function runVerifier(target, loopDir, state, task, runtime) {
  const commands = state.verification.commands.length > 0
    ? state.verification.commands
    : detectVerificationCommands(target);
  const startedAt = now();
  const result = {
    artifact: "verification-results",
    loopId: state.loopId,
    taskId: task ? task.id : null,
    status: "not_run",
    startedAt,
    updatedAt: startedAt,
    commands,
    runs: [],
    evidenceRequired: true,
    summary: ""
  };

  if (commands.length === 0) {
    result.status = "missing_evidence";
    result.summary = "No verification commands were configured or detected.";
    writeJson(path.join(loopDir, LOOP_FILE_NAMES.verification), result, { overwrite: true });
    return result;
  }

  ensureDirectory(path.join(loopDir, "artifacts", "logs"));
  for (const command of commands) {
    const safety = commandSafety(command, state.autonomyTier);
    if (!safety.allowed) {
      result.runs.push({
        command,
        status: "blocked",
        reason: safety.reason,
        startedAt: now(),
        finishedAt: now()
      });
      continue;
    }

    const run = executeCommand(command, target, path.join(loopDir, "artifacts", "logs"));
    result.runs.push(run);
  }

  if (result.runs.some((run) => run.status === "blocked")) {
    result.status = "blocked";
  } else if (result.runs.every((run) => run.status === "pass")) {
    result.status = "pass";
  } else {
    result.status = "fail";
  }
  result.updatedAt = now();
  result.summary = summarizeVerification(result);
  writeJson(path.join(loopDir, LOOP_FILE_NAMES.verification), result, { overwrite: true });
  appendActivity(state, "verifier", "verification", result.summary);
  return result;
}

function runReviewer(loop, state, task, verification, runtime) {
  const specSummary = readJson(path.join(loop.loopDir, LOOP_FILE_NAMES.specSummaryJson), {});
  const standards = readJson(path.join(loop.loopDir, LOOP_FILE_NAMES.standardsJson), {});
  const findings = [];

  if (!task) {
    findings.push(finding("blocker", "No active task is available for review.", "Select or create a task before reviewing."));
  }

  if (specSummary.missingRequirements && specSummary.missingRequirements.length > 0) {
    findings.push(finding(
      "important",
      `Spec summary is missing: ${specSummary.missingRequirements.join(", ")}.`,
      "Resolve missing requirements or explicitly accept them as out of scope."
    ));
  }

  if (specSummary.ambiguousRequirements && specSummary.ambiguousRequirements.length > 0) {
    findings.push(finding(
      "important",
      "Spec contains ambiguous requirements or open questions.",
      "Clarify or record a decision before relying on the ambiguous behavior."
    ));
  }

  if (!verification || verification.status === "not_run" || verification.status === "missing_evidence") {
    findings.push(finding("blocker", "Objective verification evidence is missing.", "Configure or run verification before completion."));
  } else if (verification.status !== "pass") {
    findings.push(finding("blocker", `Verification status is ${verification.status}.`, "Return to Builder and fix the failing checks."));
  }

  if (task && (!task.passFailChecks || task.passFailChecks.length === 0)) {
    findings.push(finding("blocker", `${task.id} has no objective pass/fail checks.`, "Add pass/fail checks before claiming the task is complete."));
  }

  if (task) {
    for (const issue of validateTaskModelRouting(task)) {
      findings.push(issue);
    }
  }

  const missingStandardsCategories = STANDARD_CATEGORIES.filter((category) => {
    const rules = standards.categories && standards.categories[category];
    return !Array.isArray(rules) || rules.length === 0;
  });
  if (missingStandardsCategories.length > 0) {
    findings.push(finding(
      "polish",
      `No explicit standards were extracted for: ${missingStandardsCategories.join(", ")}.`,
      "Add standards if those categories matter for this project."
    ));
  }

  if (state.pendingApproval && state.pendingApproval.status === "pending") {
    findings.push(finding("blocker", `Pending approval: ${state.pendingApproval.reason}`, "Human approval or rejection is required."));
  }

  const review = {
    artifact: "loop-review",
    loopId: state.loopId,
    taskId: task ? task.id : null,
    status: findings.some((item) => item.severity === "blocker") ? "changes_requested" : "accepted",
    updatedAt: now(),
    findings
  };

  writeText(path.join(loop.loopDir, LOOP_FILE_NAMES.review), renderReviewMarkdown(review), { overwrite: true });
  appendActivity(state, "reviewer-agent", "review", `${review.status} with ${findings.length} finding(s).`);
  return review;
}

function finalizeLoop(loop, state, runtime) {
  const verification = readJson(path.join(loop.loopDir, LOOP_FILE_NAMES.verification), emptyVerification(state.loopId));
  const review = readReviewSummary(path.join(loop.loopDir, LOOP_FILE_NAMES.review));

  if (verification.status !== "pass") {
    state.status = "blocked";
    state.stage = "verification";
    appendDecision(state, "blocked", "Loop cannot complete without passing verification evidence.");
    return { stop: true };
  }

  if (review.status && review.status !== "accepted") {
    state.status = "blocked";
    state.stage = "review";
    appendDecision(state, "blocked", "Loop cannot complete while review has unresolved requested changes.");
    return { stop: true };
  }

  state.status = "complete";
  state.stage = "complete";
  state.completedAt = now();
  appendDecision(state, "complete", "All tasks are complete with passing verification and accepted review.");
  return { stop: true };
}

function saveLoop(loop, state, options = {}) {
  state.updatedAt = now();
  writeJson(path.join(loop.loopDir, LOOP_FILE_NAMES.state), state, { dryRun: options.dryRun, overwrite: true });
  writeText(path.join(loop.loopDir, LOOP_FILE_NAMES.tasks), renderTasksMarkdown(state), { dryRun: options.dryRun, overwrite: true });
  writeText(path.join(loop.loopDir, LOOP_FILE_NAMES.decisions), renderDecisionsMarkdown(state), { dryRun: options.dryRun, overwrite: true });
  writeText(path.join(loop.loopDir, LOOP_FILE_NAMES.activity), renderActivityMarkdown(state), { dryRun: options.dryRun, overwrite: true });
  writeText(path.join(loop.loopDir, LOOP_FILE_NAMES.memory), renderMemoryMarkdown(state), { dryRun: options.dryRun, overwrite: true });
  writeText(path.join(loop.loopDir, LOOP_FILE_NAMES.builderPrompt), state.builderPrompt || "", { dryRun: options.dryRun, overwrite: true });
  writeText(path.join(loop.loopDir, LOOP_FILE_NAMES.reviewerPrompt), state.reviewerPrompt || "", { dryRun: options.dryRun, overwrite: true });
  writeText(path.join(loop.loopDir, LOOP_FILE_NAMES.report), renderReportMarkdown(state), { dryRun: options.dryRun, overwrite: true });
}

function writeLoopArtifacts(loopDir, state, specSummary, standards, verification, review, options = {}) {
  ensureDirectory(loopDir, options.dryRun);
  ensureDirectory(path.join(loopDir, "artifacts"), options.dryRun);
  ensureDirectory(path.join(loopDir, "artifacts", "logs"), options.dryRun);
  writeJson(path.join(loopDir, LOOP_FILE_NAMES.state), state, options);
  writeJson(path.join(loopDir, LOOP_FILE_NAMES.specSummaryJson), specSummary, options);
  writeText(path.join(loopDir, LOOP_FILE_NAMES.specSummary), renderSpecSummaryMarkdown(specSummary), options);
  writeJson(path.join(loopDir, LOOP_FILE_NAMES.standardsJson), standards, options);
  writeText(path.join(loopDir, LOOP_FILE_NAMES.standardsChecklist), standards.checklist, options);
  writeText(path.join(loopDir, LOOP_FILE_NAMES.tasks), renderTasksMarkdown(state), options);
  writeJson(path.join(loopDir, LOOP_FILE_NAMES.verification), verification, options);
  writeText(path.join(loopDir, LOOP_FILE_NAMES.review), renderReviewMarkdown(review), options);
  writeText(path.join(loopDir, LOOP_FILE_NAMES.decisions), renderDecisionsMarkdown(state), options);
  writeText(path.join(loopDir, LOOP_FILE_NAMES.memory), renderMemoryMarkdown(state), options);
  writeText(path.join(loopDir, LOOP_FILE_NAMES.activity), renderActivityMarkdown(state), options);
  writeText(path.join(loopDir, LOOP_FILE_NAMES.builderPrompt), "", options);
  writeText(path.join(loopDir, LOOP_FILE_NAMES.reviewerPrompt), "", options);
  writeText(path.join(loopDir, LOOP_FILE_NAMES.builderOutput), "", options);
  writeText(path.join(loopDir, LOOP_FILE_NAMES.reviewerOutput), "", options);
  writeText(path.join(loopDir, LOOP_FILE_NAMES.report), renderReportMarkdown(state), options);
}

function loadLoopFromOptions(options, runtime) {
  const target = path.resolve(options.target || ".");
  const loopId = options.positionals[0] || readCurrentLoopId(target);
  const fail = runtime.fail || defaultFail;
  if (!loopId) {
    fail("No loop id was provided and no current loop marker exists. Run ai-delivery loop init first.");
  }
  const loopDir = path.join(target, ".ai", "loops", loopId);
  if (!fs.existsSync(loopDir)) {
    fail(`Loop not found: ${loopDir}`);
  }
  const state = readJson(path.join(loopDir, LOOP_FILE_NAMES.state), null);
  if (!state) {
    fail(`Loop state is missing: ${path.join(loopDir, LOOP_FILE_NAMES.state)}`);
  }
  return { target, loopId, loopDir, state };
}

function resolveExistingInput(target, value, fallbacks) {
  if (value) {
    const filePath = path.resolve(target, value);
    return fs.existsSync(filePath) ? filePath : null;
  }
  for (const fallback of fallbacks) {
    const filePath = path.resolve(target, fallback);
    if (fs.existsSync(filePath)) return filePath;
  }
  return null;
}

function writeCurrentLoop(target, loopId, loopDir, options = {}) {
  const markerPath = path.join(target, ".ai", "loops", "current.json");
  writeJson(markerPath, {
    loopId,
    loopDir,
    updatedAt: now()
  }, { dryRun: options.dryRun, overwrite: true });
}

function readCurrentLoopId(target) {
  const marker = readJson(path.join(target, ".ai", "loops", "current.json"), null);
  return marker && marker.loopId ? marker.loopId : null;
}

function nextRunnableTask(state) {
  return state.tasks.find((task) => {
    if (task.status === "complete") return false;
    const dependencies = task.dependencies || [];
    return dependencies.every((id) => {
      const dependency = state.tasks.find((candidate) => candidate.id === id);
      return dependency && dependency.status === "complete";
    });
  });
}

function currentOrLastTask(state) {
  if (state.currentTaskId) {
    const current = state.tasks.find((task) => task.id === state.currentTaskId);
    if (current) return current;
  }
  return state.tasks.find((task) => task.status !== "complete") || state.tasks[state.tasks.length - 1] || null;
}

function hasTaskApproval(task, gate) {
  return Array.isArray(task.approvals) && task.approvals.some((approval) => approval.gate === gate);
}

function validateTaskModelRouting(task) {
  const findings = [];
  const aiProvider = task.ai_provider;
  if (!aiProvider || typeof aiProvider !== "object") {
    return [finding("blocker", `${task.id} is missing ai_provider model routing.`, "Add ai_provider before implementation or review.")];
  }

  for (const field of ["provider", "model", "reason", "requires_premium_review"]) {
    if (aiProvider[field] === undefined || aiProvider[field] === "") {
      findings.push(finding("blocker", `${task.id} ai_provider.${field} is missing.`, "Complete the required model routing field."));
    }
  }

  const text = `${task.title}\n${task.objective}\n${(task.sourceItems || []).join("\n")}\n${(task.passFailChecks || []).join("\n")}`;
  const premiumTriggers = detectPremiumReview(text);
  if (premiumTriggers.length > 0 && aiProvider.requires_premium_review !== true) {
    findings.push(finding(
      "blocker",
      `${task.id} touches premium-review areas (${premiumTriggers.map((item) => item.category).join(", ")}) but requires_premium_review is not true.`,
      "Set requires_premium_review: true and route final review to the configured premium-review route."
    ));
  }

  const reviewer = task.ai_reviewer;
  if (aiProvider.requires_premium_review && (!reviewer || !routeIsPremiumReview(reviewer))) {
    findings.push(finding(
      "blocker",
      `${task.id} requires premium-review routing.`,
      "Record ai_reviewer from the configured premium-review route before merge."
    ));
  }

  if (reviewer && !reviewModelIsAtLeastImplementation(reviewer, aiProvider)) {
    findings.push(finding(
      "blocker",
      `${task.id} final review route ${reviewer.model} is weaker than implementation route ${aiProvider.model}.`,
      "Use an equal-or-stronger final review route according to risk_tier or strength_rank."
    ));
  }

  if (!aiProvider.risk_tier && aiProvider.strength_rank === undefined) {
    findings.push(finding(
      "important",
      `${task.id} has no risk_tier or strength_rank.`,
      "Declare at least one so provider-agnostic review strength can be validated."
    ));
  }

  if (aiProvider.model === "other" || aiProvider.provider === "other") {
    if (!aiProvider.execution || !aiProvider.execution.model) {
      findings.push(finding(
        "important",
        `${task.id} uses an 'other' provider or model without ai_provider.execution.model.`,
        "Declare the concrete runtime model so external command routing can launch the intended AI."
      ));
    }
  }

  return findings;
}

function reviewModelIsAtLeastImplementation(reviewRoute = {}, implementationRoute = {}) {
  if (reviewRoute.model && reviewRoute.model === implementationRoute.model) return true;
  const reviewStrength = routeStrength(reviewRoute);
  const implementationStrength = routeStrength(implementationRoute);
  if (reviewStrength === 0 && implementationStrength === 0) return true;
  return reviewStrength >= implementationStrength && reviewStrength > 0;
}

function appendDecision(state, action, notes) {
  state.decisions.push({
    at: now(),
    action,
    taskId: state.currentTaskId,
    notes
  });
}

function appendActivity(state, actor, action, notes) {
  state.activity.push({
    at: now(),
    actor,
    action,
    status: state.status,
    taskId: state.currentTaskId,
    notes
  });
}

function buildBuilderPrompt(state, task) {
  return `# Builder Prompt: ${task.id} ${task.title}

Loop: ${state.loopId}
Target: ${state.target}
Autonomy tier: ${state.autonomyTier}

## Task Objective

${task.objective}

## Source Items

${markdownList(task.sourceItems)}

## Pass/Fail Checks

${markdownList(task.passFailChecks)}

## Standards Categories

${markdownList(task.standardsCategories)}

## AI Model Routing

\`\`\`yaml
${renderAiProviderYaml(task.ai_provider)}
\`\`\`

Reviewer: ${task.ai_reviewer ? `${task.ai_reviewer.provider} ${task.ai_reviewer.model} - ${task.ai_reviewer.reason}` : "N/A"}

## Required Loop Rules

- Follow the normalized standards in STANDARDS.json and STANDARDS_CHECKLIST.md.
- Follow the AI model routing above. Missing routing fails standards validation.
- Implement only this task's scope unless the spec or dependency requires otherwise.
- Do not perform high-impact actions without an approval recorded in STATE.json.
- After implementation, run: ai-delivery loop run ${state.loopId} --after-build

## Builder Log Requirement

Record meaningful implementation notes in REPORT.md or the loop activity state after each pass.
`;
}

function buildExternalReviewerPrompt(state, task, verification) {
  return `# Reviewer Prompt: ${task.id} ${task.title}

Loop: ${state.loopId}
Target: ${state.target}
Autonomy tier: ${state.autonomyTier}

## Review Objective

Review the implemented task against the source items, pass/fail checks, verification evidence, and model routing rules. Record findings in ${LOOP_FILE_NAMES.reviewerOutput} or in the configured command output.

## Task Objective

${task.objective}

## Source Items

${markdownList(task.sourceItems)}

## Pass/Fail Checks

${markdownList(task.passFailChecks)}

## Verification Summary

Status: ${verification.status}

${verification.summary || "No verification summary recorded."}

## AI Review Routing

\`\`\`yaml
${renderAiProviderYaml(task.ai_reviewer || task.ai_provider)}
\`\`\`

## Required Review Rules

- Check the final review route is equal or stronger than the implementation route.
- Require configured premium-review routing for work touching auth, billing, payments, migrations, permissions, or customer data.
- Prioritize bugs, behavioral regressions, missing tests, and security/privacy risks.
- Do not approve work without verification evidence.
`;
}

function runExternalAgentCommand(commandTemplate, state, task, loopDir, role, runtime, options = {}) {
  const promptFile = options.promptFile || LOOP_FILE_NAMES.builderPrompt;
  const outputFile = options.outputFile || (role === "reviewer" ? LOOP_FILE_NAMES.reviewerOutput : LOOP_FILE_NAMES.builderOutput);
  const promptPath = path.join(loopDir, promptFile);
  const outputPath = path.join(loopDir, outputFile);
  const command = renderAgentCommandTemplate(commandTemplate, {
    state,
    task,
    loopDir,
    role,
    promptPath,
    outputPath,
    activeRoute: options.activeRoute
  });
  const safety = commandSafety(command, state.autonomyTier);
  if (!safety.allowed) {
    return {
      ok: false,
      summary: `${role} command blocked: ${safety.reason}`
    };
  }
  const run = executeCommand(command, state.target, path.join(loopDir, "artifacts", "logs"));
  return {
    ok: run.status === "pass",
    summary: `${role} command ${run.status}: ${command}`
  };
}

function renderAgentCommandTemplate(commandTemplate, context) {
  const task = context.task;
  const aiProvider = task.ai_provider || {};
  const aiReviewer = task.ai_reviewer || {};
  const activeRoute = context.activeRoute || (context.role === "reviewer" && aiReviewer ? aiReviewer : aiProvider);
  const activeExecution = resolveExecutionRoute(activeRoute);
  const builderExecution = resolveExecutionRoute(aiProvider);
  const reviewerExecution = resolveExecutionRoute(aiReviewer);
  const replacements = {
    "{prompt}": shellQuote(context.promptPath),
    "{output}": shellQuote(context.outputPath),
    "{loopDir}": shellQuote(context.loopDir),
    "{taskId}": shellQuote(task.id),
    "{target}": shellQuote(context.state.target),
    "{provider}": shellQuote(activeRoute.provider || ""),
    "{model}": shellQuote(activeRoute.model || ""),
    "{reason}": shellQuote(activeRoute.reason || ""),
    "{executionRunner}": shellQuote(activeExecution.runner || ""),
    "{executionProvider}": shellQuote(activeExecution.provider || ""),
    "{executionModel}": shellQuote(activeExecution.model || ""),
    "{executionProfile}": shellQuote(activeExecution.profile || ""),
    "{codexProvider}": shellQuote(activeExecution.codexProvider || ""),
    "{codexModel}": shellQuote(activeExecution.codexModel || ""),
    "{codexProfile}": shellQuote(activeExecution.codexProfile || ""),
    "{codexProfileArg}": codexProfileArg(activeExecution),
    "{codexConfigArgs}": codexConfigArgs(activeExecution),
    "{builderProvider}": shellQuote(aiProvider.provider || ""),
    "{builderModel}": shellQuote(aiProvider.model || ""),
    "{builderExecutionProvider}": shellQuote(builderExecution.provider || ""),
    "{builderExecutionModel}": shellQuote(builderExecution.model || ""),
    "{builderCodexConfigArgs}": codexConfigArgs(builderExecution),
    "{reviewerProvider}": shellQuote(aiReviewer.provider || ""),
    "{reviewerModel}": shellQuote(aiReviewer.model || ""),
    "{reviewerExecutionProvider}": shellQuote(reviewerExecution.provider || ""),
    "{reviewerExecutionModel}": shellQuote(reviewerExecution.model || ""),
    "{reviewerCodexConfigArgs}": codexConfigArgs(reviewerExecution),
    "{aiProviderJson}": shellQuote(JSON.stringify(aiProvider)),
    "{aiReviewerJson}": shellQuote(JSON.stringify(aiReviewer))
  };

  let command = commandTemplate;
  for (const [placeholder, value] of Object.entries(replacements)) {
    command = command.replaceAll(placeholder, value);
  }
  return command;
}

function resolveExecutionRoute(aiProvider = {}) {
  const semanticProvider = aiProvider.provider || "";
  const semanticModel = aiProvider.model || "";
  const execution = aiProvider.execution && typeof aiProvider.execution === "object" ? aiProvider.execution : {};
  const defaults = defaultExecutionRoute(semanticProvider, semanticModel);

  return {
    runner: execution.runner || defaults.runner,
    provider: execution.provider || defaults.provider,
    model: execution.model || defaults.model,
    profile: execution.profile || defaults.profile,
    codexProvider: execution.codex_provider || execution.provider || defaults.codexProvider,
    codexModel: execution.codex_model || execution.model || defaults.codexModel,
    codexProfile: execution.codex_profile || execution.profile || defaults.codexProfile
  };
}

function defaultExecutionRoute(provider, model) {
  const executionModel = model === "other" || provider === "project-configured" ? "" : model;
  const executionProvider = provider === "project-configured" ? "" : provider;

  return {
    runner: "",
    provider: executionProvider,
    model: executionModel,
    profile: "",
    codexProvider: executionProvider,
    codexModel: executionModel,
    codexProfile: ""
  };
}

function codexProfileArg(route) {
  return route.codexProfile ? `--profile ${shellQuote(route.codexProfile)}` : "";
}

function codexConfigArgs(route) {
  const args = [];
  if (route.codexProfile) {
    args.push("--profile", shellQuote(route.codexProfile));
  } else if (route.codexProvider) {
    args.push("-c", shellQuote(`model_provider="${route.codexProvider}"`));
  }
  if (route.codexModel) {
    args.push("-m", shellQuote(route.codexModel));
  }
  return args.join(" ");
}

function detectVerificationCommands(target) {
  const packagePath = path.join(target, "package.json");
  if (!fs.existsSync(packagePath)) return [];
  const packageJson = readJson(packagePath, {});
  const scripts = packageJson.scripts || {};
  const commands = [];
  for (const script of ["check", "lint", "typecheck", "test", "build"]) {
    if (scripts[script]) commands.push(`npm run ${script}`);
  }
  return commands;
}

function commandSafety(command, autonomyTier) {
  const impact = detectHighImpact(command);
  if (impact.length > 0) {
    return {
      allowed: false,
      reason: `Command matches high-impact action: ${impact.map((item) => item.category).join(", ")}`
    };
  }

  if (String(autonomyTier) === "1") {
    const normalized = command.trim();
    const safe = LOCAL_SAFE_COMMAND_PATTERNS.some((pattern) => pattern.test(normalized));
    if (!safe) {
      return {
        allowed: false,
        reason: "Tier 1 only allows safe local read/build/test/check commands."
      };
    }
  }

  return { allowed: true };
}

function executeCommand(command, cwd, logDir) {
  const startedAt = now();
  const startedMs = Date.now();
  const logName = `${startedAt.replace(/[:.]/g, "-")}-${slugify(command).slice(0, 40)}.log`;
  const logPath = path.join(logDir, logName);
  let output = "";
  let status = "fail";
  let exitCode = null;

  try {
    const result = childProcess.spawnSync(command, {
      cwd,
      shell: true,
      encoding: "utf8",
      timeout: 120000,
      maxBuffer: 1024 * 1024
    });
    exitCode = result.status === null ? 1 : result.status;
    output = `${result.stdout || ""}${result.stderr || ""}`;
    status = exitCode === 0 ? "pass" : "fail";
    if (result.error) {
      output += `\n${result.error.message}`;
      status = result.error.code === "ETIMEDOUT" ? "timeout" : "fail";
    }
  } catch (error) {
    output = error.message;
    status = "fail";
  }

  fs.writeFileSync(logPath, output);
  return {
    command,
    status,
    exitCode,
    startedAt,
    finishedAt: now(),
    durationMs: Date.now() - startedMs,
    logPath
  };
}

function detectHighImpact(text) {
  return HIGH_IMPACT_PATTERNS.filter((item) => item.pattern.test(text));
}

function autonomyTierPolicy(tier) {
  const normalized = normalizeAutonomyTier(tier);
  if (normalized === "1") {
    return {
      name: "safe autonomous",
      allowed: [
        "read files",
        "inspect logs",
        "run local tests, builds, type checks, lint checks, smoke checks",
        "update local docs and loop state",
        "start local dev servers",
        "perform local browser and screenshot checks"
      ],
      humanApprovalRequiredFor: highImpactCategories()
    };
  }
  if (normalized === "2") {
    return {
      name: "local implementation",
      allowed: [
        "tier 1 actions",
        "local source edits through a configured builder agent",
        "local dependency and generated-file updates when reversible"
      ],
      humanApprovalRequiredFor: highImpactCategories()
    };
  }
  return {
    name: "operator approved",
    allowed: [
      "tier 1 and tier 2 actions",
      "approved high-impact actions only after an explicit recorded approval"
    ],
    humanApprovalRequiredFor: highImpactCategories()
  };
}

function highImpactCategories() {
  return HIGH_IMPACT_PATTERNS.map((item) => item.category);
}

function normalizeAutonomyTier(value) {
  const tier = String(value || "1").trim();
  if (!["1", "2", "3"].includes(tier)) {
    defaultFail("--autonomy-tier must be 1, 2, or 3.");
  }
  return tier;
}

function splitMarkdownSections(markdown) {
  const lines = markdown.split(/\r?\n/);
  const sections = [];
  let current = { heading: "", content: [] };
  for (const line of lines) {
    const match = /^(#{1,6})\s+(.+?)\s*$/.exec(line);
    if (match) {
      sections.push({ heading: current.heading, content: current.content.join("\n") });
      current = { heading: match[2].trim(), content: [] };
    } else {
      current.content.push(line);
    }
  }
  sections.push({ heading: current.heading, content: current.content.join("\n") });
  return sections.filter((section) => section.heading || section.content.trim());
}

function firstHeading(markdown) {
  const match = /^#\s+(.+?)\s*$/m.exec(markdown);
  return match ? match[1].trim() : "";
}

function categorizeText(text) {
  const lower = String(text || "").toLowerCase();
  for (const category of STANDARD_CATEGORIES) {
    if (CATEGORY_KEYWORDS[category].some((keyword) => lower.includes(keyword))) return category;
  }
  return "";
}

function specFieldFor(text) {
  const lower = String(text || "").toLowerCase();
  for (const [field, keywords] of Object.entries(SPEC_KEYWORDS)) {
    if (keywords.some((keyword) => lower.includes(keyword))) return field;
  }
  return "";
}

function extractRuleCandidates(content) {
  const candidates = [];
  for (const line of content.split(/\r?\n/)) {
    const cleaned = stripMarkdownPrefix(line);
    if (!cleaned) continue;
    if (/^(must|never|should|required|forbidden|do not|ensure|verify|given|when|then)\b/i.test(cleaned)) {
      candidates.push(cleaned);
      continue;
    }
    if (/^(#{1,6}|```|\|)/.test(line.trim())) continue;
    if (/^[-*+]\s+/.test(line.trim()) || /^\d+\.\s+/.test(line.trim()) || /^\[[ xX]\]\s+/.test(cleaned)) {
      candidates.push(cleaned);
    }
  }
  return unique(candidates);
}

function extractAcceptanceSentences(markdown) {
  return unique(markdown
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => stripMarkdownPrefix(sentence))
    .filter((sentence) => /\b(given|when|then|accept|must|should|success|complete|done)\b/i.test(sentence))
  ).slice(0, 20);
}

function stripMarkdownPrefix(line) {
  return String(line || "")
    .trim()
    .replace(/^[-*+]\s+/, "")
    .replace(/^\d+\.\s+/, "")
    .replace(/^\[[ xX]\]\s+/, "")
    .trim();
}

function buildPassFailChecks(title, sourceItems, verificationCommands) {
  const checks = sourceItems.length > 0
    ? sourceItems.slice(0, 8).map((item) => `Pass when observable behavior satisfies: ${item}`)
    : [`Pass when ${title.toLowerCase()} is implemented with no unresolved review blockers.`];
  if (verificationCommands.length > 0) {
    checks.push(`Pass when verification commands succeed: ${verificationCommands.join("; ")}`);
  } else {
    checks.push("Pass only after objective verification evidence is configured and recorded.");
  }
  return checks;
}

function suggestedStandardsCategories(title, standards) {
  const categories = STANDARD_CATEGORIES.filter((category) => {
    const textMatches = categorizeText(title) === category;
    const hasRules = standards.categories && Array.isArray(standards.categories[category]) && standards.categories[category].length > 0;
    return textMatches || hasRules;
  });
  return unique(categories).slice(0, 5);
}

function buildStandardsChecklist(categories) {
  const lines = ["# Standards Checklist", ""];
  for (const category of STANDARD_CATEGORIES) {
    lines.push(`## ${titleCase(category.replaceAll("_", " "))}`, "");
    const rules = categories[category] || [];
    if (rules.length === 0) {
      lines.push("- [ ] No explicit rule extracted. Decide whether this category needs project-specific standards.", "");
      continue;
    }
    for (const rule of rules) {
      lines.push(`- [ ] ${rule.rule}`);
    }
    lines.push("");
  }
  return lines.join("\n");
}

function renderSpecSummaryMarkdown(summary) {
  const lines = [`# Spec Summary: ${summary.title}`, "", `Source: \`${summary.sourcePath}\``, "", "## Goals", markdownList(summary.goals), "", "## Users", markdownList(summary.users), "", "## Workflows", markdownList(summary.workflows), "", "## Screens", markdownList(summary.screens), "", "## Data Models", markdownList(summary.dataModels), "", "## Integrations", markdownList(summary.integrations), "", "## Constraints", markdownList(summary.constraints), "", "## Acceptance Criteria", markdownList(summary.acceptanceCriteria), "", "## Missing Or Ambiguous Requirements", ""];
  lines.push("Missing:");
  lines.push(markdownList(summary.missingRequirements));
  lines.push("");
  lines.push("Ambiguous:");
  lines.push(markdownList(summary.ambiguousRequirements));
  lines.push("");
  return lines.join("\n");
}

function renderTasksMarkdown(state) {
  const lines = [`# Tasks: ${state.name}`, "", `Loop: \`${state.loopId}\``, "", "| Task | Status | Risk | Dependencies | Objective |", "| --- | --- | --- | --- | --- |"];
  for (const task of state.tasks) {
    lines.push(`| ${task.id} ${escapeTable(task.title)} | ${task.status} | ${task.risk} | ${(task.dependencies || []).join(", ") || "none"} | ${escapeTable(task.objective)} |`);
  }
  lines.push("", "## AI Model Routing", "", "| Task | Provider | Model | Risk Tier | Reason | Premium Review | Reviewer |", "| --- | --- | --- | --- | --- | --- | --- |");
  for (const task of state.tasks) {
    const aiProvider = task.ai_provider || {};
    const reviewer = task.ai_reviewer ? `${task.ai_reviewer.provider} ${task.ai_reviewer.model}` : "N/A";
    lines.push(`| ${task.id} | ${escapeTable(aiProvider.provider || "")} | ${escapeTable(aiProvider.model || "")} | ${escapeTable(aiProvider.risk_tier || "")} | ${escapeTable(aiProvider.reason || "")} | ${aiProvider.requires_premium_review === true ? "true" : "false"} | ${escapeTable(reviewer)} |`);
  }
  lines.push("", "## Pass/Fail Checks", "");
  for (const task of state.tasks) {
    lines.push(`### ${task.id}: ${task.title}`, "");
    lines.push(markdownList(task.passFailChecks));
    lines.push("");
  }
  return lines.join("\n");
}

function renderReviewMarkdown(review) {
  const lines = ["# Review", "", `Status: ${review.status}`, `Updated: ${review.updatedAt}`, "", "| Severity | Issue | Required Fix |", "| --- | --- | --- |"];
  for (const item of review.findings || []) {
    lines.push(`| ${item.severity} | ${escapeTable(item.issue)} | ${escapeTable(item.requiredFix)} |`);
  }
  if (!review.findings || review.findings.length === 0) {
    lines.push("| none | No findings. | No action required. |");
  }
  lines.push("");
  return lines.join("\n");
}

function renderDecisionsMarkdown(state) {
  const lines = ["# Decisions", "", "| Time | Action | Task | Notes |", "| --- | --- | --- | --- |"];
  for (const decision of state.decisions) {
    lines.push(`| ${decision.at} | ${decision.action} | ${decision.taskId || ""} | ${escapeTable(decision.notes)} |`);
  }
  return lines.join("\n");
}

function renderActivityMarkdown(state) {
  const lines = ["# Activity", "", "| Time | Actor | Action | Status | Task | Notes |", "| --- | --- | --- | --- | --- | --- |"];
  for (const event of state.activity) {
    lines.push(`| ${event.at} | ${event.actor} | ${event.action} | ${event.status} | ${event.taskId || ""} | ${escapeTable(event.notes)} |`);
  }
  return lines.join("\n");
}

function renderMemoryMarkdown(state) {
  const lines = ["# Memory", "", "Durable loop facts that future runs may rely on.", "", "| Time | Fact |", "| --- | --- |"];
  for (const entry of state.memory) {
    lines.push(`| ${entry.at} | ${escapeTable(entry.fact)} |`);
  }
  return lines.join("\n");
}

function renderReportMarkdown(state) {
  const complete = state.tasks.filter((task) => task.status === "complete").length;
  const lines = [
    `# Loop Report: ${state.name}`,
    "",
    `Loop: \`${state.loopId}\``,
    `Status: ${state.status}`,
    `Stage: ${state.stage}`,
    `Tasks: ${complete}/${state.tasks.length} complete`,
    `Last verification: ${state.lastVerificationStatus}`,
    `Last review: ${state.lastReviewStatus}`,
    "",
    "## Current Task",
    ""
  ];
  const current = currentOrLastTask(state);
  if (current) {
    lines.push(`- ${current.id}: ${current.title}`);
    lines.push(`- Status: ${current.status}`);
    lines.push(`- Objective: ${current.objective}`);
  } else {
    lines.push("- None");
  }
  lines.push("", "## Pending Approval", "");
  if (state.pendingApproval) {
    lines.push(`- ${state.pendingApproval.type}: ${state.pendingApproval.reason}`);
  } else {
    lines.push("- None");
  }
  lines.push("", "## Next Action", "", `- ${nextActionText(state)}`, "");
  return lines.join("\n");
}

function defaultReview(loopId) {
  return {
    artifact: "loop-review",
    loopId,
    taskId: null,
    status: "not_run",
    updatedAt: now(),
    findings: []
  };
}

function emptyVerification(loopId) {
  return {
    artifact: "verification-results",
    loopId,
    taskId: null,
    status: "not_run",
    updatedAt: now(),
    commands: [],
    runs: [],
    evidenceRequired: true,
    summary: "Verification has not run."
  };
}

function finding(severity, issue, requiredFix) {
  return { severity, issue, requiredFix };
}

function summarizeVerification(result) {
  if (result.status === "missing_evidence") return result.summary;
  const passed = result.runs.filter((run) => run.status === "pass").length;
  return `${passed}/${result.runs.length} verification command(s) passed.`;
}

function readReviewSummary(reviewPath) {
  if (!fs.existsSync(reviewPath)) return { status: "not_run" };
  const content = fs.readFileSync(reviewPath, "utf8");
  const match = /^Status:\s*(.+)$/m.exec(content);
  return { status: match ? match[1].trim() : "not_run" };
}

function printStatusSummary(state, runtime) {
  const complete = state.tasks.filter((task) => task.status === "complete").length;
  const current = currentOrLastTask(state);
  console.log(`loop       ${state.loopId}`);
  console.log(`status     ${state.status}`);
  console.log(`stage      ${state.stage}`);
  console.log(`tasks      ${complete}/${state.tasks.length} complete`);
  console.log(`current    ${current ? `${current.id} ${current.title} (${current.status})` : "none"}`);
  console.log(`verify     ${state.lastVerificationStatus}`);
  console.log(`review     ${state.lastReviewStatus}`);
  console.log(`next       ${nextActionText(state)}`);
}

function nextActionText(state) {
  if (state.pendingApproval && state.pendingApproval.status === "pending") {
    return `approve or reject ${state.pendingApproval.type} for ${state.pendingApproval.taskId}`;
  }
  if (state.status === "waiting_for_builder") {
    return `implement ${state.currentTaskId}, then run loop run ${state.loopId} --after-build`;
  }
  if (state.status === "paused") return `run loop resume ${state.loopId}`;
  if (state.status === "blocked") return "resolve blockers, then resume or rerun the loop";
  if (state.status === "complete") return "view REPORT.md";
  return `run loop run ${state.loopId}`;
}

function parseLoopArgs(argv, schema) {
  const options = { positionals: [] };
  const booleans = new Set(schema.boolean || []);
  const strings = new Set(schema.string || []);
  const arrays = new Set(schema.array || []);

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

    if (strings.has(rawName) || arrays.has(rawName)) {
      const value = inlineValue === undefined ? argv[index + 1] : inlineValue;
      if (value === undefined || value.startsWith("--")) {
        defaultFail(`Missing value for --${rawName}`);
      }
      if (arrays.has(rawName)) {
        options[rawName] = options[rawName] || [];
        options[rawName].push(value);
      } else {
        options[rawName] = value;
      }
      if (inlineValue === undefined) index += 1;
      continue;
    }

    defaultFail(`Unknown option: --${rawName}`);
  }

  return options;
}

function normalizeArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value.filter(Boolean) : [value].filter(Boolean);
}

function writeJson(filePath, value, options = {}) {
  writeText(filePath, `${JSON.stringify(value, null, 2)}\n`, options);
}

function writeText(filePath, content, options = {}) {
  if (options.dryRun) {
    console.log(`would write ${path.relative(process.cwd(), filePath)}`);
    return;
  }
  if (fs.existsSync(filePath) && !options.overwrite) {
    console.log(`kept ${path.relative(process.cwd(), filePath)}`);
    return;
  }
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content);
}

function readJson(filePath, fallback) {
  if (!fs.existsSync(filePath)) return fallback;
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function ensureDirectory(directory, dryRun) {
  if (dryRun) {
    console.log(`would ensure ${path.relative(process.cwd(), directory)}`);
    return;
  }
  fs.mkdirSync(directory, { recursive: true });
}

function markdownList(items) {
  if (!items || items.length === 0) return "- None recorded.";
  return items.map((item) => `- ${item}`).join("\n");
}

function renderAiProviderYaml(aiProvider = {}) {
  const lines = [
    "ai_provider:",
    `  provider: ${aiProvider.provider || ""}`,
    `  model: ${aiProvider.model || ""}`,
    `  reason: ${aiProvider.reason || ""}`
  ];
  if (aiProvider.risk_tier) {
    lines.push(`  risk_tier: ${aiProvider.risk_tier}`);
  }
  if (aiProvider.strength_rank !== undefined) {
    lines.push(`  strength_rank: ${aiProvider.strength_rank}`);
  }
  if (aiProvider.fallback_model) {
    lines.push(`  fallback_model: ${aiProvider.fallback_model}`);
  }
  lines.push(`  requires_premium_review: ${aiProvider.requires_premium_review === true ? "true" : "false"}`);
  if (aiProvider.reviewer_route) {
    lines.push(`  reviewer_route: ${aiProvider.reviewer_route}`);
  }
  if (aiProvider.execution && typeof aiProvider.execution === "object") {
    lines.push("  execution:");
    for (const field of ["runner", "provider", "model", "profile", "codex_provider", "codex_model", "codex_profile"]) {
      if (aiProvider.execution[field]) {
        lines.push(`    ${field}: ${aiProvider.execution[field]}`);
      }
    }
  }
  return lines.join("\n");
}

function escapeTable(value) {
  return String(value || "").replaceAll("|", "\\|").replace(/\r?\n/g, " ");
}

function unique(values) {
  return [...new Set(values.map((value) => String(value).trim()).filter(Boolean))];
}

function titleCase(value) {
  return value.replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function hashText(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function slugify(value) {
  return String(value || "loop")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "loop";
}

function normalizeLoopId(value) {
  return slugify(value).toUpperCase().replaceAll("-", "_");
}

function todayCompact() {
  return new Date().toISOString().slice(0, 10).replaceAll("-", "");
}

function now() {
  return new Date().toISOString();
}

function shellQuote(value) {
  return `'${String(value).replaceAll("'", "'\\''")}'`;
}

function log(runtime, message) {
  if (runtime.logDone) runtime.logDone(message);
  else console.log(message);
}

function defaultFail(message) {
  throw new Error(message);
}

function printLoopHelp(runtime = {}) {
  const cli = runtime.commandName ? runtime.commandName() : "ai-delivery";
  console.log(`${cli} loop

Usage:
  ${cli} loop init --spec SPEC.md --standards AI_STANDARDS.md [options]
  ${cli} loop run [loop-id] [--target .] [--after-build]
  ${cli} loop resume [loop-id] [--target .]
  ${cli} loop status [loop-id] [--target .]
  ${cli} loop tasks [loop-id] [--target .]
  ${cli} loop verify [loop-id] [--target .] [--verify "npm test"]
  ${cli} loop results [loop-id] [--target .]
  ${cli} loop review [loop-id] [--target .]
  ${cli} loop approve [loop-id] [--gate high_impact_action] [--actor name]
  ${cli} loop reject [loop-id] [--gate high_impact_action] [--notes reason]
  ${cli} loop pause [loop-id] [--reason text]
  ${cli} loop report [loop-id] [--target .]

Options:
  --target <path>             Project repository. Default: .
  --spec <path>               Product or operational task specification.
  --standards <path>          AI Standards markdown file.
  --id <id>                   Stable loop id.
  --name <name>               Human-readable loop name.
  --autonomy-tier <1|2|3>     1=safe local checks, 2=local builder command, 3=approved high-impact only.
  --verify <command>          Verification command. Can be repeated.
  --routed-codex              Use routed Codex exec commands for builder and reviewer models.
  --builder-command <command> External builder hook with {prompt}, {output}, {loopDir}, {taskId}, {target}, {provider}, {model}, {executionProvider}, {executionModel}, {codexConfigArgs}.
  --reviewer-command <command> External reviewer hook with the same placeholders, routed through ai_reviewer when present.
  --after-build               Tell the loop the current task has been implemented and should be verified.
  --force                     Overwrite generated loop artifacts during init.

Loop state lives under .ai/loops/<loop-id>/.
`);
}

module.exports = {
  handleLoopCommand,
  normalizeStandards,
  normalizeSpec,
  planTasks,
  detectHighImpact,
  commandSafety
};
