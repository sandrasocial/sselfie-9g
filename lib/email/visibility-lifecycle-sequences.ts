export type VisibilityLifecycleSequenceId =
  | "quiz_message_clarity_5d"
  | "quiz_consistency_5d"
  | "quiz_sales_5d"
  | "micro_to_suite_4d"
  | "suite_to_studio_7d"
  | "studio_to_sprint_14d"

export type VisibilityLifecycleTrigger =
  | "quiz_message_result"
  | "quiz_consistency_result"
  | "quiz_sales_result"
  | "micro_purchase"
  | "suite_purchase"
  | "studio_member"

export type VisibilityLifecycleTouch = {
  days: number
  emailType: string
  goal: string
}

export type VisibilityLifecycleSequence = {
  id: VisibilityLifecycleSequenceId
  trigger: VisibilityLifecycleTrigger
  tags: string[]
  touches: VisibilityLifecycleTouch[]
}

export const VISIBILITY_LIFECYCLE_SEQUENCES: VisibilityLifecycleSequence[] = [
  {
    id: "quiz_message_clarity_5d",
    trigger: "quiz_message_result",
    tags: ["visibility", "quiz", "message"],
    touches: [
      { days: 0, emailType: "quiz-message-clarity-day0", goal: "Send the What To Say next step." },
      { days: 2, emailType: "quiz-message-clarity-day2", goal: "Reduce message overwhelm." },
      { days: 5, emailType: "quiz-message-clarity-day5", goal: "Invite into What To Say or Suite." },
    ],
  },
  {
    id: "quiz_consistency_5d",
    trigger: "quiz_consistency_result",
    tags: ["visibility", "quiz", "consistency"],
    touches: [
      { days: 0, emailType: "quiz-consistency-day0", goal: "Send the Show Up next step." },
      { days: 2, emailType: "quiz-consistency-day2", goal: "Name the content rhythm problem." },
      { days: 5, emailType: "quiz-consistency-day5", goal: "Invite into Show Up or Suite." },
    ],
  },
  {
    id: "quiz_sales_5d",
    trigger: "quiz_sales_result",
    tags: ["visibility", "quiz", "sales"],
    touches: [
      { days: 0, emailType: "quiz-sales-day0", goal: "Send the Get Paid next step." },
      { days: 2, emailType: "quiz-sales-day2", goal: "Teach the post-to-buyer path." },
      { days: 5, emailType: "quiz-sales-day5", goal: "Invite into Get Paid or Suite." },
    ],
  },
  {
    id: "micro_to_suite_4d",
    trigger: "micro_purchase",
    tags: ["visibility", "micro", "suite"],
    touches: [
      { days: 1, emailType: "micro-to-suite-day1", goal: "Help the buyer complete the first win." },
      { days: 3, emailType: "micro-to-suite-day3", goal: "Show the next product in the path." },
      { days: 4, emailType: "micro-to-suite-day4", goal: "Invite into Visibility Suite." },
    ],
  },
  {
    id: "suite_to_studio_7d",
    trigger: "suite_purchase",
    tags: ["visibility", "suite", "studio"],
    touches: [
      { days: 1, emailType: "suite-to-studio-day1", goal: "Start the Suite in order." },
      { days: 4, emailType: "suite-to-studio-day4", goal: "Bridge from plan to weekly execution." },
      { days: 7, emailType: "suite-to-studio-day7", goal: "Invite into Studio." },
    ],
  },
  {
    id: "studio_to_sprint_14d",
    trigger: "studio_member",
    tags: ["visibility", "studio", "private-sprint"],
    touches: [
      { days: 7, emailType: "studio-to-sprint-day7", goal: "Identify where private help would remove friction." },
      { days: 14, emailType: "studio-to-sprint-day14", goal: "Invite into Private Sprint application." },
    ],
  },
]

export function getVisibilityLifecycleSequence(id: VisibilityLifecycleSequenceId) {
  return VISIBILITY_LIFECYCLE_SEQUENCES.find((sequence) => sequence.id === id) || null
}
