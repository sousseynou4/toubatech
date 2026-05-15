import {
  Body,
  Container,
  Head,
  Hr,
  Html,
  Preview,
  Section,
  Text,
  Tailwind,
} from '@react-email/components';
import {
  DEVICE_LABELS,
  PROBLEM_LABELS,
  INCIDENT_LABELS,
  PICKUP_LABELS,
} from '@/lib/labels';

interface TeamNotificationEmailProps {
  reference: string;
  fullName: string;
  email: string;
  phone: string;
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

const BRAND = {
  ink: '#003366',
  ink700: '#001F3F',
  ink400: '#2D5A8E',
  ink300: '#5C84B0',
  emerald: '#339966',
  bone: '#FAFAF7',
  mist: '#F0F0F0',
  border: '#E5E7EB',
};

export default function TeamNotificationEmail({
  reference = 'TT-260510-XXXX',
  fullName = 'Client',
  email = 'client@example.com',
  phone = '06 00 00 00 00',
  device = 'smartphone',
  brand = 'Apple',
  model = 'iPhone 13',
  problems = [],
  problemDetails = '',
  incident = 'aucun',
  incidentDetails = '',
  pickup = 'siege',
  preferredDate = '',
  preferredTime = '',
}: TeamNotificationEmailProps) {
  // Quick urgency heuristic for visual emphasis
  const urgent = problems.includes('oxydation') || problems.includes('micro-soudure');

  return (
    <Html lang="fr">
      <Head />
      <Preview>
        🔧 Nouvelle demande {reference} — {DEVICE_LABELS[device]} {brand} {model}
      </Preview>
      <Tailwind>
        <Body
          style={{
            backgroundColor: BRAND.bone,
            fontFamily:
              '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            margin: 0,
            padding: 0,
          }}
        >
          <Container
            style={{ maxWidth: '600px', margin: '0 auto', padding: '24px 16px' }}
          >
            <Section
              style={{
                backgroundColor: '#FFFFFF',
                padding: '24px',
                borderRadius: '12px',
                border: `1px solid ${BRAND.border}`,
              }}
            >
              {/* Status banner */}
              <table cellPadding={0} cellSpacing={0} style={{ width: '100%' }}>
                <tr>
                  <td>
                    <Text
                      style={{
                        fontSize: '11px',
                        letterSpacing: '0.18em',
                        textTransform: 'uppercase',
                        color: urgent ? '#B91C1C' : BRAND.emerald,
                        margin: 0,
                        fontFamily: '"SF Mono", Menlo, Consolas, monospace',
                        fontWeight: 600,
                      }}
                    >
                      {urgent ? '⚠ Priorité haute' : '✓ Nouvelle demande'}
                    </Text>
                  </td>
                  <td align="right">
                    <Text
                      style={{
                        fontSize: '13px',
                        color: BRAND.ink,
                        margin: 0,
                        fontFamily: '"SF Mono", Menlo, Consolas, monospace',
                        fontWeight: 600,
                      }}
                    >
                      {reference}
                    </Text>
                  </td>
                </tr>
              </table>

              <Text
                style={{
                  fontSize: '20px',
                  fontWeight: 500,
                  color: BRAND.ink,
                  margin: '16px 0 4px 0',
                  letterSpacing: '-0.02em',
                }}
              >
                {DEVICE_LABELS[device]} · {brand} {model}
              </Text>
              <Text
                style={{
                  fontSize: '13px',
                  color: BRAND.ink400,
                  margin: 0,
                }}
              >
                {problems.map((p) => PROBLEM_LABELS[p]).join(' · ')}
              </Text>

              <Hr style={{ borderColor: BRAND.border, margin: '24px 0' }} />

              <DataRow label="Client" value={fullName} />
              <DataRow label="Email" value={email} mono />
              <DataRow label="Téléphone" value={phone} mono />
              <DataRow label="Prise en charge" value={PICKUP_LABELS[pickup]} />
              {(preferredDate || preferredTime) && (
                <DataRow
                  label="Créneau"
                  value={[preferredDate, preferredTime].filter(Boolean).join(' · ')}
                />
              )}
              <DataRow label="Historique" value={INCIDENT_LABELS[incident]} />

              {problemDetails && (
                <Section
                  style={{
                    marginTop: '16px',
                    padding: '12px 14px',
                    backgroundColor: BRAND.bone,
                    borderRadius: '8px',
                    borderLeft: `3px solid ${BRAND.ink}`,
                  }}
                >
                  <Text
                    style={{
                      fontSize: '10px',
                      color: BRAND.ink300,
                      textTransform: 'uppercase',
                      letterSpacing: '0.1em',
                      margin: 0,
                      fontFamily: '"SF Mono", Menlo, Consolas, monospace',
                    }}
                  >
                    Description du problème
                  </Text>
                  <Text
                    style={{
                      fontSize: '13px',
                      color: BRAND.ink,
                      margin: '4px 0 0 0',
                      lineHeight: 1.5,
                      whiteSpace: 'pre-line' as const,
                    }}
                  >
                    {problemDetails}
                  </Text>
                </Section>
              )}

              {incidentDetails && (
                <Section
                  style={{
                    marginTop: '8px',
                    padding: '12px 14px',
                    backgroundColor: BRAND.bone,
                    borderRadius: '8px',
                    borderLeft: `3px solid ${BRAND.ink}`,
                  }}
                >
                  <Text
                    style={{
                      fontSize: '10px',
                      color: BRAND.ink300,
                      textTransform: 'uppercase',
                      letterSpacing: '0.1em',
                      margin: 0,
                      fontFamily: '"SF Mono", Menlo, Consolas, monospace',
                    }}
                  >
                    Contexte
                  </Text>
                  <Text
                    style={{
                      fontSize: '13px',
                      color: BRAND.ink,
                      margin: '4px 0 0 0',
                      lineHeight: 1.5,
                      whiteSpace: 'pre-line' as const,
                    }}
                  >
                    {incidentDetails}
                  </Text>
                </Section>
              )}

              <Hr style={{ borderColor: BRAND.border, margin: '24px 0 16px 0' }} />

              <Text
                style={{
                  fontSize: '12px',
                  color: BRAND.ink300,
                  margin: 0,
                  textAlign: 'center' as const,
                }}
              >
                Consulter dans Supabase · Répondre à <strong>{email}</strong>
              </Text>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}

function DataRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <table
      cellPadding={0}
      cellSpacing={0}
      style={{ width: '100%', marginBottom: '8px' }}
    >
      <tr>
        <td style={{ width: '120px', verticalAlign: 'top' }}>
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
        </td>
        <td>
          <Text
            style={{
              fontSize: '14px',
              color: BRAND.ink,
              margin: 0,
              fontFamily: mono
                ? '"SF Mono", Menlo, Consolas, monospace'
                : 'inherit',
            }}
          >
            {value}
          </Text>
        </td>
      </tr>
    </table>
  );
}
