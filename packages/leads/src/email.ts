import { SITE } from "@ibtatech/config";

export interface EmailAttachment {
  filename: string;
  content: Uint8Array;
}

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
  from?: string;
  replyTo?: string;
  tags?: { name: string; value: string }[];
  attachments?: EmailAttachment[];
}

export interface EmailDeliveryResult {
  delivered: boolean;
  error?: string;
}

export type EmailTransport = (message: EmailMessage) => Promise<EmailDeliveryResult>;

export function defaultFromAddress(): string {
  const from = process.env.EMAIL_FROM?.trim();
  return from || `${SITE.name} <${SITE.email}>`;
}

export function createConsoleTransport(): EmailTransport {
  return async (message) => {
    const attachments =
      message.attachments && message.attachments.length > 0
        ? ` [${message.attachments.map((a) => a.filename).join(", ")}]`
        : "";
    console.info(
      `[email] not delivered to ${message.to} — "${message.subject}" (no provider configured)${attachments}`,
    );
    return { delivered: false, error: "no provider configured" };
  };
}

export interface ResendTransportOptions {
  apiKey: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
  endpoint?: string;
}

export function createResendTransport(options: ResendTransportOptions): EmailTransport {
  const fetchImpl = options.fetchImpl ?? fetch;
  const endpoint = options.endpoint ?? "https://api.resend.com/emails";

  return async (message) => {
    try {
      const response = await fetchImpl(endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${options.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: message.from ?? defaultFromAddress(),
          to: [message.to],
          subject: message.subject,
          html: message.html,
          text: message.text,
          ...(message.replyTo ? { reply_to: message.replyTo } : {}),
          ...(message.tags && message.tags.length > 0 ? { tags: message.tags } : {}),
          ...(message.attachments && message.attachments.length > 0
            ? {
                attachments: message.attachments.map((attachment) => ({
                  filename: attachment.filename,
                  content: Buffer.from(attachment.content).toString("base64"),
                })),
              }
            : {}),
        }),
        signal: AbortSignal.timeout(options.timeoutMs ?? 10_000),
      });

      if (!response.ok) {
        const detail = await response.text().catch(() => "");
        return {
          delivered: false,
          error: `resend ${response.status}: ${detail.slice(0, 300)}`,
        };
      }
      return { delivered: true };
    } catch (error) {
      return {
        delivered: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  };
}

export function describeEmailTransport(): string {
  if (process.env.EMAIL_TRANSPORT === "console") return "console";
  return process.env.RESEND_API_KEY?.trim() ? "resend" : "console";
}

export function resolveEmailTransport(): EmailTransport {
  if (process.env.EMAIL_TRANSPORT === "console") return createConsoleTransport();
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (apiKey) return createResendTransport({ apiKey });
  return createConsoleTransport();
}

let transportOverride: EmailTransport | undefined;

export function setEmailTransport(t: EmailTransport | undefined): void {
  transportOverride = t;
}

export async function sendEmail(message: EmailMessage): Promise<EmailDeliveryResult> {
  const transport = transportOverride ?? resolveEmailTransport();
  try {
    return await transport(message);
  } catch (error) {
    return {
      delivered: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
