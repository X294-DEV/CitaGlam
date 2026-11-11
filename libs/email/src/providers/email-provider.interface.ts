export interface EmailOptions {
  to: string;
  subject: string;
  template?: string;
  html?: string;
  context: any;
}

export interface EmailProvider {
  sendEmail(options: EmailOptions): Promise<void>;
  verifyConnection(config?: any): Promise<boolean>;
  renderPreview(body: string, subject: string): Promise<string>;
}
