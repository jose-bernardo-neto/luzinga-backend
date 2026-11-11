export interface MailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

/**
 * Porta de saída para envio de e-mail.
 * O adapter de produção (SMTP/Resend/SES) deve implementar esta interface.
 */
export interface Mailer {
  send(message: MailMessage): Promise<void>;
}
