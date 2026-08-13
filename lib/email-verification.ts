export type EmailConfirmationState = {
  email_confirmed_at?: string | null;
};

export function isEmailVerified(
  user: EmailConfirmationState | null | undefined
) {
  return Boolean(user?.email_confirmed_at);
}
