/**
 * Payment Failed Email Template
 *
 * Sent when a subscription payment fails.
 * Simple notification to update payment method.
 */

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
  Hr,
} from '@react-email/components';
import * as React from 'react';
import { EMAIL_CONFIG } from '../resend';

interface PaymentFailedEmailProps {
  artistName: string;
  billingPortalUrl: string;
  to: string;
}

export default function PaymentFailedEmail({
  artistName = 'Artist',
  billingPortalUrl = 'https://inkdex.io/billing',
  to = 'artist@example.com',
}: PaymentFailedEmailProps) {
  const previewText = 'Payment issue - update your payment method';

  return (
    <Html>
      <Head>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@900&family=JetBrains+Mono:wght@200;400;600&display=swap');
        `}</style>
      </Head>
      <Preview>{previewText}</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Amber warning border */}
          <div style={statusBorder} />

          {/* Logo */}
          <Section style={logoSection}>
            <Text style={logoText}>INKDEX</Text>
          </Section>

          {/* Hero */}
          <Section style={heroSection}>
            <Heading style={h1}>Payment Issue</Heading>
            <div style={accentLine} />
          </Section>

          {/* Personalized greeting */}
          <Text style={greeting}>{artistName},</Text>

          <Text style={bodyText}>
            We couldn&apos;t process your Pro subscription payment. Please update
            your payment method to keep your Pro features active.
          </Text>

          {/* What to do */}
          <Section style={infoSection}>
            <Text style={sectionLabel}>What To Do</Text>

            <div style={infoItem}>
              <Text style={infoIcon}>1</Text>
              <div>
                <Text style={infoTitle}>Update Payment Method</Text>
                <Text style={infoBody}>
                  Visit the billing portal to add a new card or fix your current payment details.
                </Text>
              </div>
            </div>

            <div style={infoItem}>
              <Text style={infoIcon}>2</Text>
              <div>
                <Text style={infoTitle}>Automatic Retry</Text>
                <Text style={infoBody}>
                  Once updated, we&apos;ll automatically retry the payment.
                </Text>
              </div>
            </div>
          </Section>

          {/* CTA */}
          <Section style={ctaSection}>
            <Button style={ctaButton} href={billingPortalUrl}>
              Update Payment Method →
            </Button>
          </Section>

          {/* Help note */}
          <Text style={noteText}>
            Having trouble? Contact{' '}
            <Link href="mailto:support@inkdex.io" style={noteLink}>
              support@inkdex.io
            </Link>{' '}
            and we&apos;ll help resolve any billing issues.
          </Text>

          {/* Footer */}
          <Section style={footerSection}>
            <Hr style={divider} />

            <Text style={footerLabel}>Billing Portal</Text>
            <Text style={footerLink}>
              <Link href={billingPortalUrl} style={link}>
                Manage subscription
              </Link>
            </Text>

            <Text style={footerLabel}>Support</Text>
            <Text style={footerLink}>
              <Link href="mailto:support@inkdex.io" style={link}>
                support@inkdex.io
              </Link>
            </Text>

            <Text style={unsubscribeText}>
              <Link href={EMAIL_CONFIG.unsubscribeUrl(to)} style={unsubscribeLink}>
                Unsubscribe from emails
              </Link>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

// Styles
const main = {
  backgroundColor: '#F8F7F5',
  fontFamily: "'JetBrains Mono', 'Courier New', monospace",
};

const container = {
  margin: '0 auto',
  padding: '0',
  maxWidth: '600px',
  background: '#FFFFFF',
};

const statusBorder = {
  height: '8px',
  background: '#F59E0B',
};

const logoSection = {
  padding: '48px 32px 24px',
  textAlign: 'center' as const,
};

const logoText = {
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: '14px',
  fontWeight: '600',
  letterSpacing: '0.2em',
  color: '#1A1A1A',
  margin: '0',
};

const heroSection = {
  padding: '24px 32px 48px',
  textAlign: 'center' as const,
};

const h1 = {
  fontFamily: "'Playfair Display', serif",
  fontSize: '52px',
  fontWeight: '900',
  lineHeight: '1.1',
  color: '#1A1A1A',
  margin: '0 0 24px',
  letterSpacing: '-0.02em',
};

const accentLine = {
  width: '80px',
  height: '2px',
  margin: '0 auto',
  background: '#F59E0B',
};

const greeting = {
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: '13px',
  fontWeight: '400',
  letterSpacing: '0.05em',
  color: '#8B8985',
  textTransform: 'uppercase' as const,
  margin: '0 32px 16px',
};

const bodyText = {
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: '15px',
  fontWeight: '300',
  lineHeight: '1.8',
  color: '#4A4845',
  margin: '0 32px 48px',
};

const sectionLabel = {
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: '10px',
  fontWeight: '600',
  letterSpacing: '0.15em',
  textTransform: 'uppercase' as const,
  color: '#1A1A1A',
  margin: '0 0 16px',
};

const infoSection = {
  margin: '0 32px 48px',
};

const infoItem = {
  display: 'flex',
  gap: '20px',
  marginBottom: '24px',
  alignItems: 'flex-start',
};

const infoIcon = {
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: '14px',
  fontWeight: '600',
  margin: '0',
  minWidth: '32px',
  height: '32px',
  lineHeight: '32px',
  textAlign: 'center' as const,
  background: '#F0EFEC',
  color: '#1A1A1A',
  borderRadius: '50%',
};

const infoTitle = {
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: '14px',
  fontWeight: '600',
  color: '#1A1A1A',
  margin: '0 0 6px',
};

const infoBody = {
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: '13px',
  fontWeight: '300',
  lineHeight: '1.7',
  color: '#4A4845',
  margin: '0',
};

const ctaSection = {
  padding: '0 32px 32px',
  textAlign: 'center' as const,
};

const ctaButton = {
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: '14px',
  fontWeight: '600',
  letterSpacing: '0.05em',
  color: '#FFFFFF',
  background: '#1A1A1A',
  padding: '16px 48px',
  textDecoration: 'none',
  display: 'inline-block',
  border: 'none',
  borderRadius: '0',
};

const noteText = {
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: '13px',
  fontWeight: '300',
  lineHeight: '1.7',
  color: '#4A4845',
  margin: '0 32px 48px',
  textAlign: 'center' as const,
};

const noteLink = {
  color: '#1A1A1A',
  textDecoration: 'none',
  borderBottom: '1px solid #D8D6D2',
};

const footerSection = {
  padding: '48px 32px',
  background: '#F8F7F5',
};

const divider = {
  border: 'none',
  borderTop: '1px solid #D8D6D2',
  margin: '0 0 24px',
};

const footerLabel = {
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: '10px',
  fontWeight: '600',
  letterSpacing: '0.15em',
  textTransform: 'uppercase' as const,
  color: '#8B8985',
  margin: '0 0 4px',
  marginTop: '24px',
};

const footerLink = {
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: '13px',
  fontWeight: '400',
  color: '#1A1A1A',
  margin: '0 0 16px',
};

const link = {
  color: '#1A1A1A',
  textDecoration: 'none',
  borderBottom: '1px solid #D8D6D2',
};

const unsubscribeText = {
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: '11px',
  fontWeight: '300',
  color: '#8B8985',
  margin: '32px 0 0',
  textAlign: 'center' as const,
};

const unsubscribeLink = {
  color: '#8B8985',
  textDecoration: 'underline',
};
