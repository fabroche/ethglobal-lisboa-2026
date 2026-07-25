/**
 * The reach-out message sent with a room invite (S3.15). Single source for the
 * share button; mirrors `docs/ux/invite-message.md` (the amended, no-overclaim
 * version). Greeting carries no name (we cannot know it) and there is no
 * signature; the sender's app adds their identity.
 *
 * Privacy rule, same as the QR: role + link + public deadline only. Never the
 * deal type, never any terms.
 */
export function buildInviteText(input: {
  roleLabel: string;
  url: string;
  deadlineIso?: string;
}): string {
  const deadline = input.deadlineIso
    ? new Date(input.deadlineIso).toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : undefined;

  return [
    "Hi,",
    "",
    "Before we get into numbers, I'd like to check whether there's a deal here at all, without either of us having to show our hand first. I'm using a tool called Overlap for exactly that.",
    "",
    "Here's why it's safe: we each write our position privately, and yours is sealed in your browser before it ever leaves your device. I never see your terms, and you never see mine. The comparison runs inside secure hardware, and the only thing that ever comes out is a single line: whether a deal looks possible. No figures are revealed to either of us.",
    "",
    `If it comes back not workable, nothing is lost. If it looks workable, we know it's worth a real conversation. It takes about a minute (there's a quick check that you're a real person, to keep it fair)${deadline ? `, and the deadline is ${deadline}` : ""}.`,
    "",
    `Your link (you'd be the ${input.roleLabel}): ${input.url}`,
  ].join("\n");
}
