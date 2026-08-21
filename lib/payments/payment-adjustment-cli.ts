export type PaymentAdjustmentCliTarget = {
  type: "refund" | "dispute" | "charge"
  id: string
}

type PaymentAdjustmentReconciliationModule = Pick<
  typeof import("@/lib/payments/lifecycle/payment-adjustments"),
  | "getPaymentAdjustmentReportProjection"
  | "getPaymentAdjustmentReviewQueue"
  | "reconcilePaymentAdjustmentTargets"
  | "reconcilePaymentAdjustmentWindow"
>

export const PAYMENT_ADJUSTMENT_CLI_USAGE =
  'Use --report, exact IDs with --livemode=live|test, or bounded discovery with --livemode=live|test --since="ISO" --until="ISO".'

const TARGET_PATTERNS: Array<{
  type: PaymentAdjustmentCliTarget["type"]
  pattern: RegExp
}> = [
  { type: "refund", pattern: /^--refund=((?:re_|pyr_)[A-Za-z0-9]+)$/ },
  { type: "dispute", pattern: /^--dispute=((?:dp_|du_)[A-Za-z0-9]+)$/ },
  { type: "charge", pattern: /^--charge=((?:ch_|py_)[A-Za-z0-9]+)$/ },
]

const TARGET_PREFIXES = ["--refund=", "--dispute=", "--charge="] as const

export function parsePaymentAdjustmentTargetArgument(
  argument: string
): PaymentAdjustmentCliTarget | null {
  for (const candidate of TARGET_PATTERNS) {
    const match = argument.match(candidate.pattern)
    if (match) return { type: candidate.type, id: match[1] }
  }
  return null
}

export function parsePaymentAdjustmentTargetArguments(
  arguments_: readonly string[]
): PaymentAdjustmentCliTarget[] {
  return arguments_
    .filter(argument => TARGET_PREFIXES.some(prefix => argument.startsWith(prefix)))
    .map(argument => {
      const target = parsePaymentAdjustmentTargetArgument(argument)
      if (!target) {
        throw new Error("Invalid payment-adjustment target flag")
      }
      return target
    })
}

export async function runPaymentAdjustmentCli(
  arguments_: readonly string[],
  loadReconciliationModule: () => Promise<PaymentAdjustmentReconciliationModule>
): Promise<unknown> {
  const record = arguments_.includes("--record")
  const reportOnly = arguments_.includes("--report")
  const modeArgument = arguments_.find(argument => argument.startsWith("--livemode="))
  const modeValue = modeArgument?.slice("--livemode=".length)
  if (modeValue && modeValue !== "live" && modeValue !== "test") {
    throw new Error("--livemode must be live or test")
  }

  let targets
  try {
    targets = parsePaymentAdjustmentTargetArguments(arguments_)
  } catch {
    throw new Error(`Invalid payment-adjustment target flag. ${PAYMENT_ADJUSTMENT_CLI_USAGE}`)
  }

  const sinceValue = arguments_
    .find(argument => argument.startsWith("--since="))
    ?.slice("--since=".length)
  const untilValue = arguments_
    .find(argument => argument.startsWith("--until="))
    ?.slice("--until=".length)

  const {
    getPaymentAdjustmentReportProjection,
    getPaymentAdjustmentReviewQueue,
    reconcilePaymentAdjustmentTargets,
    reconcilePaymentAdjustmentWindow,
  } = await loadReconciliationModule()

  if (reportOnly) {
    if (record || targets.length || sinceValue || untilValue) {
      throw new Error(
        `--report cannot be combined with reconciliation flags. ${PAYMENT_ADJUSTMENT_CLI_USAGE}`
      )
    }
    return {
      ...(await getPaymentAdjustmentReportProjection()),
      ...(await getPaymentAdjustmentReviewQueue()),
    }
  }

  if (!modeValue) {
    throw new Error(
      `An explicit --livemode=live or --livemode=test is required. ${PAYMENT_ADJUSTMENT_CLI_USAGE}`
    )
  }
  const expectedLivemode = modeValue === "live"
  if (targets.length) {
    if (sinceValue || untilValue) {
      throw new Error(
        `Exact ID targets cannot be combined with --since/--until. ${PAYMENT_ADJUSTMENT_CLI_USAGE}`
      )
    }
    return reconcilePaymentAdjustmentTargets({ targets, expectedLivemode, record })
  }
  if (!sinceValue || !untilValue) {
    throw new Error(`Bounded --since and --until are required. ${PAYMENT_ADJUSTMENT_CLI_USAGE}`)
  }
  return reconcilePaymentAdjustmentWindow({
    since: new Date(sinceValue),
    until: new Date(untilValue),
    expectedLivemode,
    record,
  })
}
