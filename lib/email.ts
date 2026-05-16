import { Resend } from 'resend';
import { render } from '@react-email/render';
import DiagnosticConfirmationEmail from '@/components/emails/DiagnosticConfirmation';
import TeamNotificationEmail from '@/components/emails/TeamNotification';
import type { DiagnosticPayload } from './validation';

function getResend() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error('RESEND_API_KEY is missing — add it to .env.local');
  }
  return new Resend(apiKey);
}

const FROM = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
const TEAM_EMAIL = process.env.RESEND_TEAM_NOTIFICATION_EMAIL;

interface SendDiagnosticEmailsArgs {
  reference: string;
  data: DiagnosticPayload;
}

interface EmailResult {
  customerEmailId: string | null;
  teamEmailId: string | null;
  errors: string[];
}

/**
 * Send both the customer confirmation and the internal team notification.
 * Errors are collected (not thrown) so a partial failure doesn't fail
 * the whole API request — the diagnostic is already saved in DB.
 */
export async function sendDiagnosticEmails({
  reference,
  data,
}: SendDiagnosticEmailsArgs): Promise<EmailResult> {
  const resend = getResend();
  const errors: string[] = [];
  let customerEmailId: string | null = null;
  let teamEmailId: string | null = null;

  // ── Customer confirmation ─────────────────────────────────────
  try {
    const html = await render(
      DiagnosticConfirmationEmail({
        reference,
        fullName: data.fullName,
        device: data.device,
        brand: data.brand,
        model: data.model,
        problems: data.problems,
        problemDetails: data.problemDetails,
        incident: data.incident,
        incidentDetails: data.incidentDetails,
        pickup: data.pickup,
        preferredDate: data.preferredDate || '',
        preferredTime: data.preferredTime,
      })
    );
    const text = await render(
      DiagnosticConfirmationEmail({
        reference,
        fullName: data.fullName,
        device: data.device,
        brand: data.brand,
        model: data.model,
        problems: data.problems,
        problemDetails: data.problemDetails,
        incident: data.incident,
        incidentDetails: data.incidentDetails,
        pickup: data.pickup,
        preferredDate: data.preferredDate || '',
        preferredTime: data.preferredTime,
      }),
      { plainText: true }
    );

    const result = await resend.emails.send({
      from: `TOUBA TECH <${FROM}>`,
      to: data.email,
      subject: `Votre demande de diagnostic est bien reçue · ${reference}`,
      html,
      text,
      reply_to: TEAM_EMAIL || undefined,
      tags: [
        { name: 'category', value: 'diagnostic_confirmation' },
        { name: 'reference', value: reference },
      ],
    });

    if (result.error) {
      errors.push(`customer: ${result.error.message}`);
    } else {
      customerEmailId = result.data?.id ?? null;
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown';
    errors.push(`customer: ${msg}`);
  }

  // ── Team notification ─────────────────────────────────────────
  if (TEAM_EMAIL) {
    try {
      const html = await render(
        TeamNotificationEmail({
          reference,
          fullName: data.fullName,
          email: data.email,
          phone: data.phone,
          device: data.device,
          brand: data.brand,
          model: data.model,
          problems: data.problems,
          problemDetails: data.problemDetails,
          incident: data.incident,
          incidentDetails: data.incidentDetails,
          pickup: data.pickup,
          preferredDate: data.preferredDate || '',
          preferredTime: data.preferredTime,
        })
      );

      const urgent =
        data.problems.includes('oxydation') ||
        data.problems.includes('micro-soudure');

      const result = await resend.emails.send({
        from: `TOUBA TECH <${FROM}>`,
        to: TEAM_EMAIL,
        subject: `${urgent ? '⚠ ' : ''}Nouvelle demande ${reference} — ${data.brand} ${data.model}`,
        html,
        replyTo: data.email,
        tags: [
          { name: 'category', value: 'team_notification' },
          { name: 'reference', value: reference },
        ],
      });

      if (result.error) {
        errors.push(`team: ${result.error.message}`);
      } else {
        teamEmailId = result.data?.id ?? null;
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'unknown';
      errors.push(`team: ${msg}`);
    }
  }

  return { customerEmailId, teamEmailId, errors };
}
