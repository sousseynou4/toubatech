import {
  Body,
  Container,
  Head,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
  Tailwind,
  Row,
  Column,
} from '@react-email/components';
import {
  DEVICE_LABELS,
  PROBLEM_LABELS,
  INCIDENT_LABELS,
  PICKUP_LABELS,
  PICKUP_DESCRIPTIONS,
  TIME_LABELS,
} from '@/lib/labels';

interface DiagnosticConfirmationEmailProps {
  reference: string;
  fullName: string;
  device: string;
  brand: string;
  model: string;
  problems: string[];
  problemDetails?: string;
  incident: string;
  incidentDetails?: string;
  pickup: string;
  preferredDate?: string;
  preferredTime?: string;
}

// TOUBA TECH brand colors — must use hex (CSS vars don't work in email clients)
const BRAND = {
  ink: '#003366',
  ink700: '#001F3F',
  ink400: '#2D5A8E',
  ink300: '#5C84B0',
  emerald: '#339966',
  emerald5: '#E8F5EE',
  bone: '#FAFAF7',
  mist: '#F0F0F0',
  border: '#E5E7EB',
};

export default function DiagnosticConfirmationEmail({
  reference = 'TT-260510-XXXX',
  fullName = 'Client',
  device = 'smartphone',
  brand = 'Apple',
  model = 'iPhone 13',
  problems = ['ecran'],
  problemDetails = '',
  incident = 'chute',
  incidentDetails = '',
  pickup = 'siege',
  preferredDate = '',
  preferredTime = '',
}: DiagnosticConfirmationEmailProps) {
  const formatDate = (iso: string) => {
    if (!iso) return '';
    try {
      const d = new Date(iso);
      return d.toLocaleDateString('fr-FR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    } catch {
      return iso;
    }
  };

  return (
    <Html lang="fr">
      <Head />
      <Preview>
        Demande {reference} bien reçue — pré-diagnostic sous 24h ouvrées
      </Preview>
      <Tailwind>
        <Body
          style={{
            backgroundColor: BRAND.bone,
            fontFamily:
              '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
            margin: 0,
            padding: 0,
          }}
        >
          <Container
            style={{
              maxWidth: '560px',
              margin: '0 auto',
              padding: '24px 16px',
            }}
          >
            {/* ── Header bar with logo ─────────────────────────────── */}
            <Section
              style={{
                padding: '32px 32px 24px 32px',
                backgroundColor: BRAND.ink,
                borderRadius: '16px 16px 0 0',
              }}
            >
              <Row>
                <Column>
                  <table cellPadding={0} cellSpacing={0} style={{ borderCollapse: 'collapse' }}>
                    <tr>
                      <td style={{ verticalAlign: 'middle', paddingRight: '10px' }}>
                        <div
                          style={{
                            width: '32px',
                            height: '32px',
                            backgroundColor: BRAND.ink700,
                            borderRadius: '8px',
                            textAlign: 'center',
                            lineHeight: '32px',
                          }}
                        >
                          <span
                            style={{
                              color: BRAND.emerald,
                              fontSize: '18px',
                              fontWeight: 700,
                            }}
                          >
                            ✓
                          </span>
                        </div>
                      </td>
                      <td style={{ verticalAlign: 'middle' }}>
                        <Text
                          style={{
                            color: BRAND.bone,
                            fontSize: '15px',
                            fontWeight: 500,
                            margin: 0,
                            letterSpacing: '-0.01em',
                          }}
                        >
                          TOUBA <span style={{ color: BRAND.emerald }}>TECH</span>
                        </Text>
                      </td>
                    </tr>
                  </table>
                </Column>
                <Column align="right">
                  <Text
                    style={{
                      color: 'rgba(250, 250, 247, 0.6)',
                      fontSize: '10px',
                      letterSpacing: '0.18em',
                      textTransform: 'uppercase',
                      fontFamily: '"SF Mono", Menlo, Consolas, monospace',
                      margin: 0,
                    }}
                  >
                    Lorient · Morbihan
                  </Text>
                </Column>
              </Row>
            </Section>

            {/* ── Main card ───────────────────────────────────────── */}
            <Section
              style={{
                backgroundColor: '#FFFFFF',
                padding: '40px 32px 32px 32px',
                borderLeft: `1px solid ${BRAND.border}`,
                borderRight: `1px solid ${BRAND.border}`,
              }}
            >
              {/* Confirmation badge */}
              <table cellPadding={0} cellSpacing={0}>
                <tr>
                  <td>
                    <div
                      style={{
                        display: 'inline-block',
                        padding: '4px 10px',
                        backgroundColor: BRAND.emerald5,
                        borderRadius: '999px',
                      }}
                    >
                      <Text
                        style={{
                          color: BRAND.emerald,
                          fontSize: '11px',
                          letterSpacing: '0.18em',
                          textTransform: 'uppercase',
                          fontFamily: '"SF Mono", Menlo, Consolas, monospace',
                          margin: 0,
                          fontWeight: 500,
                        }}
                      >
                        Demande reçue
                      </Text>
                    </div>
                  </td>
                </tr>
              </table>

              <Text
                style={{
                  fontSize: '26px',
                  fontWeight: 500,
                  color: BRAND.ink,
                  margin: '20px 0 0 0',
                  lineHeight: 1.15,
                  letterSpacing: '-0.025em',
                }}
              >
                Bonjour {fullName.split(' ')[0]},
              </Text>
              <Text
                style={{
                  fontSize: '15px',
                  color: BRAND.ink400,
                  lineHeight: 1.6,
                  margin: '12px 0 0 0',
                }}
              >
                Nous avons bien reçu votre demande de diagnostic. Notre équipe analyse les
                informations et vous recontacte sous{' '}
                <strong style={{ color: BRAND.ink }}>24h ouvrées</strong> avec un pré-diagnostic
                et une estimation tarifaire personnalisée.
              </Text>

              {/* ── Reference card ──────────────────────────────── */}
              <Section
                style={{
                  marginTop: '28px',
                  padding: '20px',
                  backgroundColor: BRAND.bone,
                  borderRadius: '12px',
                  border: `1px solid ${BRAND.border}`,
                }}
              >
                <Text
                  style={{
                    fontSize: '10px',
                    letterSpacing: '0.18em',
                    textTransform: 'uppercase',
                    color: BRAND.ink300,
                    margin: 0,
                    fontFamily: '"SF Mono", Menlo, Consolas, monospace',
                  }}
                >
                  Votre référence
                </Text>
                <Text
                  style={{
                    fontSize: '22px',
                    fontWeight: 600,
                    color: BRAND.ink,
                    margin: '6px 0 0 0',
                    fontFamily: '"SF Mono", Menlo, Consolas, monospace',
                    letterSpacing: '0.02em',
                  }}
                >
                  {reference}
                </Text>
                <Text
                  style={{
                    fontSize: '12px',
                    color: BRAND.ink400,
                    margin: '6px 0 0 0',
                    lineHeight: 1.5,
                  }}
                >
                  Conservez cette référence — elle permet de suivre votre demande à chaque étape.
                </Text>
              </Section>

              <Hr style={{ borderColor: BRAND.border, margin: '32px 0 24px 0' }} />

              {/* ── Recap ─────────────────────────────────────────── */}
              <Text
                style={{
                  fontSize: '10px',
                  letterSpacing: '0.18em',
                  textTransform: 'uppercase',
                  color: BRAND.ink300,
                  margin: '0 0 16px 0',
                  fontFamily: '"SF Mono", Menlo, Consolas, monospace',
                }}
              >
                Récapitulatif de votre demande
              </Text>

              <RecapRow
                label="Appareil"
                value={`${DEVICE_LABELS[device] ?? device} · ${brand} ${model}`}
              />
              <RecapRow
                label="Problèmes identifiés"
                value={problems.map((p) => PROBLEM_LABELS[p] ?? p).join(', ')}
              />
              {problemDetails && (
                <RecapRow label="Précisions" value={problemDetails} multiline />
              )}
              <RecapRow label="Historique" value={INCIDENT_LABELS[incident] ?? incident} />
              {incidentDetails && (
                <RecapRow label="Contexte" value={incidentDetails} multiline />
              )}
              <RecapRow
                label="Prise en charge"
                value={PICKUP_LABELS[pickup] ?? pickup}
                description={PICKUP_DESCRIPTIONS[pickup]}
              />
              {(preferredDate || preferredTime) && (
                <RecapRow
                  label="Créneau souhaité"
                  value={
                    [
                      preferredDate ? formatDate(preferredDate) : '',
                      preferredTime ? TIME_LABELS[preferredTime] ?? preferredTime : '',
                    ]
                      .filter(Boolean)
                      .join(' · ') || '—'
                  }
                />
              )}

              <Hr style={{ borderColor: BRAND.border, margin: '32px 0 24px 0' }} />

              {/* ── Next steps ───────────────────────────────────── */}
              <Text
                style={{
                  fontSize: '15px',
                  fontWeight: 500,
                  color: BRAND.ink,
                  margin: '0 0 16px 0',
                  letterSpacing: '-0.01em',
                }}
              >
                Et ensuite ?
              </Text>

              <Step
                number="1"
                title="Analyse technique"
                description="Notre équipe étudie votre demande et identifie les pièces et opérations probables."
              />
              <Step
                number="2"
                title="Pré-diagnostic & estimation"
                description="Vous recevez un email avec le pré-diagnostic et une estimation tarifaire sous 24h ouvrées."
              />
              <Step
                number="3"
                title="Rendez-vous"
                description="Selon le mode choisi, dépôt au siège, point relais ou intervention à domicile."
              />

              {/* ── Contact ──────────────────────────────────────── */}
              <Section
                style={{
                  marginTop: '32px',
                  padding: '20px',
                  backgroundColor: BRAND.emerald5,
                  borderRadius: '12px',
                }}
              >
                <Text
                  style={{
                    fontSize: '14px',
                    color: BRAND.ink,
                    margin: 0,
                    lineHeight: 1.6,
                  }}
                >
                  <strong style={{ color: BRAND.emerald }}>Une question ?</strong> Répondez
                  directement à cet email ou contactez-nous à{' '}
                  <Link
                    href="mailto:contact@toubatech.com"
                    style={{ color: BRAND.ink, textDecoration: 'underline' }}
                  >
                    contact@toubatech.com
                  </Link>
                  .
                </Text>
              </Section>
            </Section>

            {/* ── Footer ──────────────────────────────────────────── */}
            <Section
              style={{
                backgroundColor: BRAND.mist,
                padding: '24px 32px',
                borderRadius: '0 0 16px 16px',
                border: `1px solid ${BRAND.border}`,
                borderTop: 'none',
              }}
            >
              <Text
                style={{
                  fontSize: '12px',
                  color: BRAND.ink400,
                  margin: 0,
                  lineHeight: 1.6,
                  textAlign: 'center' as const,
                }}
              >
                TOUBA TECH · Réparation & Reconditionné · Lorient, Morbihan
              </Text>
              <Text
                style={{
                  fontSize: '10px',
                  letterSpacing: '0.18em',
                  textTransform: 'uppercase',
                  color: BRAND.ink300,
                  margin: '8px 0 0 0',
                  textAlign: 'center' as const,
                  fontFamily: '"SF Mono", Menlo, Consolas, monospace',
                }}
              >
                Économie circulaire · Loi AGEC · QualiRépar
              </Text>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}

/* ── Sub-components ─────────────────────────────────────────────── */

function RecapRow({
  label,
  value,
  description,
  multiline,
}: {
  label: string;
  value: string;
  description?: string;
  multiline?: boolean;
}) {
  return (
    <Section style={{ marginBottom: '14px' }}>
      <Text
        style={{
          fontSize: '11px',
          color: BRAND.ink300,
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          margin: 0,
          fontFamily: '"SF Mono", Menlo, Consolas, monospace',
        }}
      >
        {label}
      </Text>
      <Text
        style={{
          fontSize: '14px',
          color: BRAND.ink,
          margin: '4px 0 0 0',
          lineHeight: 1.5,
          whiteSpace: multiline ? ('pre-line' as const) : ('normal' as const),
        }}
      >
        {value}
      </Text>
      {description && (
        <Text
          style={{
            fontSize: '12px',
            color: BRAND.ink400,
            margin: '4px 0 0 0',
            lineHeight: 1.5,
            fontStyle: 'italic',
          }}
        >
          {description}
        </Text>
      )}
    </Section>
  );
}

function Step({
  number,
  title,
  description,
}: {
  number: string;
  title: string;
  description: string;
}) {
  return (
    <table
      cellPadding={0}
      cellSpacing={0}
      style={{ borderCollapse: 'collapse', width: '100%', marginBottom: '14px' }}
    >
      <tr>
        <td style={{ verticalAlign: 'top', paddingRight: '14px', width: '32px' }}>
          <div
            style={{
              width: '28px',
              height: '28px',
              backgroundColor: BRAND.ink,
              color: BRAND.bone,
              borderRadius: '999px',
              textAlign: 'center',
              lineHeight: '28px',
              fontSize: '12px',
              fontWeight: 600,
              fontFamily: '"SF Mono", Menlo, Consolas, monospace',
            }}
          >
            {number}
          </div>
        </td>
        <td style={{ verticalAlign: 'top' }}>
          <Text
            style={{
              fontSize: '14px',
              fontWeight: 500,
              color: BRAND.ink,
              margin: 0,
              lineHeight: 1.4,
            }}
          >
            {title}
          </Text>
          <Text
            style={{
              fontSize: '13px',
              color: BRAND.ink400,
              margin: '2px 0 0 0',
              lineHeight: 1.5,
            }}
          >
            {description}
          </Text>
        </td>
      </tr>
    </table>
  );
}
