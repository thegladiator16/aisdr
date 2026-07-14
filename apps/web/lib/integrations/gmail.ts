/**
 * Gmail SMTP client — sends emails via SMTP with App Password authentication.
 * Replaces the previous Google OAuth + Gmail API approach.
 *
 * Users connect by providing their Gmail address + 16-digit App Password
 * (generated at myaccount.google.com/apppasswords). The password is
 * encrypted at rest using AES-256-GCM with SMTP_ENCRYPTION_KEY.
 *
 * For reading replies, we use IMAP with the same App Password.
 */

import nodemailer from "nodemailer";
import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

/* ------------------------------------------------------------------ */
/*  Encryption helpers                                                 */
/* ------------------------------------------------------------------ */

const ALGORITHM = "aes-256-gcm";

function getEncryptionKey(): Buffer {
  const key = process.env.SMTP_ENCRYPTION_KEY ?? "";
  if (!key) throw new Error("SMTP_ENCRYPTION_KEY not configured");
  return Buffer.from(key, "hex");
}

export function encryptPassword(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${tag.toString("hex")}:${encrypted.toString("hex")}`;
}

export function decryptPassword(ciphertext: string): string {
  const key = getEncryptionKey();
  const [ivHex, tagHex, dataHex] = ciphertext.split(":");
  if (!ivHex || !tagHex || !dataHex) throw new Error("Invalid encrypted format");
  const iv = Buffer.from(ivHex, "hex");
  const tag = Buffer.from(tagHex, "hex");
  const data = Buffer.from(dataHex, "hex");
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
}

/* ------------------------------------------------------------------ */
/*  SMTP Client                                                        */
/* ------------------------------------------------------------------ */

export interface SmtpConfig {
  email: string;
  password: string;
  name: string;
  host?: string;
  port?: number;
}

export class GmailClient {
  private email: string;
  private password: string;
  private name: string;
  private host: string;
  private port: number;

  constructor(email: string, password: string, name?: string, host?: string, port?: number) {
    this.email = email;
    this.password = password;
    this.name = name || email.split("@")[0] || "AryaSDR";
    this.host = host || "smtp.gmail.com";
    this.port = port || 587;
  }

  private createTransport() {
    return nodemailer.createTransport({
      host: this.host,
      port: this.port,
      secure: this.port === 465,
      auth: {
        user: this.email,
        pass: this.password,
      },
    });
  }

  async sendEmail(params: {
    to: string;
    subject: string;
    body: string;
    replyToMessageId?: string;
    threadId?: string;
  }): Promise<{ messageId: string; threadId: string }> {
    const transport = this.createTransport();
    const htmlBody = params.body.replace(/\n/g, "<br>");

    const mailOptions: nodemailer.SendMailOptions = {
      from: `${this.name} <${this.email}>`,
      to: params.to,
      subject: params.subject,
      html: htmlBody,
    };

    if (params.replyToMessageId) {
      mailOptions.inReplyTo = params.replyToMessageId;
      mailOptions.references = params.replyToMessageId;
    }

    const info = await transport.sendMail(mailOptions);
    const messageId = info.messageId || `smtp-${Date.now()}`;

    return {
      messageId,
      threadId: params.threadId || messageId,
    };
  }

  /**
   * Fetch new replies via IMAP. Uses the same App Password.
   * Falls back to an empty array if IMAP is unavailable — the cron
   * can retry on the next tick.
   */
  async getNewReplies(since: Date): Promise<unknown[]> {
    try {
      // @ts-expect-error imap is an optional runtime dependency
      const Imap = await import("imap").catch(() => null);
      if (!Imap) return [];

      return await new Promise<unknown[]>((resolve) => {
        const imap = new Imap.default({
          user: this.email,
          password: this.password,
          host: "imap.gmail.com",
          port: 993,
          tls: true,
          tlsOptions: { rejectUnauthorized: false },
        });

        const messages: unknown[] = [];
        const sinceStr = since.toISOString().split("T")[0];

        imap.once("ready", () => {
          imap.openBox("INBOX", true, (err: Error | null) => {
            if (err) { imap.end(); resolve([]); return; }

            imap.search(["UNSEEN", ["SINCE", sinceStr]], (searchErr: Error | null, results: number[]) => {
              if (searchErr || !results?.length) { imap.end(); resolve(messages); return; }

              const fetch = imap.fetch(results.slice(0, 50), { bodies: "", struct: true });
              fetch.on("message", (msg: any) => {
                let body = "";
                msg.on("body", (stream: any) => {
                  stream.on("data", (chunk: Buffer) => { body += chunk.toString("utf8"); });
                });
                msg.once("attributes", (attrs: any) => {
                  msg.once("end", () => {
                    messages.push({
                      id: String(attrs.uid),
                      threadId: String(attrs.uid),
                      snippet: body.slice(0, 500),
                      payload: {
                        headers: parseHeaders(body),
                        body: { data: Buffer.from(body).toString("base64") },
                      },
                    });
                  });
                });
              });
              fetch.once("end", () => { imap.end(); });
              fetch.once("error", () => { imap.end(); resolve(messages); });
            });
          });
        });

        imap.once("error", () => resolve([]));
        imap.once("end", () => resolve(messages));
        imap.connect();

        setTimeout(() => { try { imap.end(); } catch {} resolve(messages); }, 30000);
      });
    } catch {
      return [];
    }
  }

  /**
   * Verify SMTP connection by sending a test EHLO. Returns true if
   * credentials are valid, throws with a descriptive message otherwise.
   */
  async verifyConnection(): Promise<boolean> {
    const transport = this.createTransport();
    await transport.verify();
    return true;
  }

  static isConfigured(): boolean {
    return !!(process.env.SMTP_ENCRYPTION_KEY ?? "").trim();
  }
}

function parseHeaders(raw: string): Array<{ name: string; value: string }> {
  const headerBlock = raw.split("\r\n\r\n")[0] || raw.split("\n\n")[0] || "";
  const headers: Array<{ name: string; value: string }> = [];
  for (const line of headerBlock.split(/\r?\n/)) {
    const match = line.match(/^([^:]+):\s*(.*)$/);
    if (match) headers.push({ name: match[1], value: match[2] });
  }
  return headers;
}
