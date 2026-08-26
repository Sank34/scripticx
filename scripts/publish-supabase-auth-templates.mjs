import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const accessToken = process.env.SUPABASE_ACCESS_TOKEN?.trim();
const explicitProjectRef = process.env.SUPABASE_PROJECT_REF?.trim();
const publicUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const inferredProjectRef = publicUrl
  ? new URL(publicUrl).hostname.split(".")[0]
  : "";
const projectRef = explicitProjectRef || inferredProjectRef;

if (!accessToken) {
  throw new Error(
    "SUPABASE_ACCESS_TOKEN is required. Create a personal access token in the Supabase dashboard."
  );
}

if (!projectRef) {
  throw new Error(
    "SUPABASE_PROJECT_REF or NEXT_PUBLIC_SUPABASE_URL is required."
  );
}

const templatesDirectory = resolve(process.cwd(), "supabase/templates");
const templateDefinitions = [
  {
    file: "confirmation.html",
    subjectKey: "mailer_subjects_confirmation",
    subject: "Confirm your email · ScripticX",
    templateKey: "mailer_templates_confirmation_content",
  },
  {
    file: "recovery.html",
    subjectKey: "mailer_subjects_recovery",
    subject: "Reset your password · ScripticX",
    templateKey: "mailer_templates_recovery_content",
  },
  {
    file: "magic-link.html",
    subjectKey: "mailer_subjects_magic_link",
    subject: "Your sign-in link · ScripticX",
    templateKey: "mailer_templates_magic_link_content",
  },
  {
    file: "invite.html",
    subjectKey: "mailer_subjects_invite",
    subject: "Your ScripticX invitation",
    templateKey: "mailer_templates_invite_content",
  },
  {
    file: "email-change.html",
    subjectKey: "mailer_subjects_email_change",
    subject: "Confirm your new email · ScripticX",
    templateKey: "mailer_templates_email_change_content",
  },
];

const payload = {};

for (const definition of templateDefinitions) {
  payload[definition.subjectKey] = definition.subject;
  payload[definition.templateKey] = await readFile(
    resolve(templatesDirectory, definition.file),
    "utf8"
  );
}

const response = await fetch(
  `https://api.supabase.com/v1/projects/${encodeURIComponent(projectRef)}/config/auth`,
  {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  }
);

if (!response.ok) {
  const responseBody = await response.text();
  throw new Error(
    `Supabase rejected the Auth template update (${response.status}): ${responseBody}`
  );
}

console.log(
  `Published ${templateDefinitions.length} ScripticX Auth templates to ${projectRef}.`
);
