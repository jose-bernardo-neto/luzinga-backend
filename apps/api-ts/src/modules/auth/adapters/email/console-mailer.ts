import type { Mailer, MailMessage } from "@/modules/auth/ports/mailer.port";
import { logger } from "@/shared/logger";

/**
 * Adapter de desenvolvimento: registra o e-mail no log em vez de enviá-lo.
 * Em produção, substitua por um adapter SMTP/API transacional.
 */
export class ConsoleMailer implements Mailer {
  async send(message: MailMessage): Promise<void> {
    logger.info("E-mail registrado pelo adapter de console", {
      to: message.to,
      subject: message.subject,
      text: message.text,
    });
  }
}
