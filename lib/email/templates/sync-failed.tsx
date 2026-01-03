/**
 * Sync Failed Email Template - Alert Design
 *
 * Sent when Instagram auto-sync fails (OAuth revoked, rate limit, etc.).
 *
 * Design: Urgent editorial aesthetic with red accent typography,
 * structured info hierarchy, and clear action steps.
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

interface SyncFailedEmailProps {
  artistName: string;
  failureReason: string;
  failureCount: number;
  dashboardUrl: string;
  instagramHandle: string;
  needsReauth?: boolean;
  to: string;
}

export default function SyncFailedEmail({
  artistName = 'Artist',
  failureReason = 'Unknown error',
  failureCount = 1,
  dashboardUrl = 'https://inkdex.io/dashboard',
  instagramHandle = '',
  needsReauth = false,
  to = 'artist@example.com',
}: SyncFailedEmailProps) {
  const previewText = `Sync failed ${failureCount > 1 ? `${failureCount} times` : ''}—action required`;

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
          {/* Alert top border */}
          <div style={alertBorder} />

          {/* Logo */}
          <Section style={logoSection}>
            <Text style={logoText}>INKDEX</Text>
            <Text style={statusBadge}>SYNC ALERT</Text>
          </Section>

          {/* Hero - urgent but controlled */}
          <Section style={heroSection}>
            <Heading style={h1}>
              Sync<br />Interrupted
            </Heading>
            <div style={accentLine} />
          </Section>

          {/* Personalized greeting */}
          <Text style={greeting}>{artistName},</Text>

          <Text style={bodyText}>
            We couldn't sync your Instagram posts to your Inkdex profile.
            {failureCount > 1 && ` This has failed ${failureCount} times consecutively.`}
          </Text>

          {/* Error details card */}
          <Section style={errorCard}>
            <Text style={errorLabel}>Error Details</Text>
            <Text style={errorReason}>{failureReason}</Text>
            {failureCount > 1 && (
              <Text style={errorMeta}>
                Consecutive failures: {failureCount}
              </Text>
            )}
          </Section>

          {/* Action required section */}
          <Section style={actionSection}>
            <Text style={actionLabel}>
              {needsReauth ? 'Required Action' : 'Status'}
            </Text>

            {needsReauth ? (
              <>
                <Text style={actionText}>
                  <strong>Reconnect Instagram</strong>
                </Text>
                <Text style={actionBody}>
                  Your Instagram authentication has expired. This happens when you change
                  your password, revoke app permissions, or Instagram requires re-authentication.
                  Click below to reconnect.
                </Text>
              </>
            ) : (
              <Text style={actionBody}>
                We'll automatically retry syncing. If the issue persists after 3 attempts,
                auto-sync will be temporarily disabled. You can manually update your portfolio
                or contact support.
              </Text>
            )}
          </Section>

          {/* CTA */}
          <Section style={ctaSection}>
            <Button style={ctaButton} href={dashboardUrl}>
              {needsReauth ? 'Reconnect Instagram →' : 'View Dashboard →'}
            </Button>
          </Section>

          {/* Auto-disable warning */}
          {failureCount >= 2 && (
            <Section style={warningCard}>
              <Text style={warningIcon}>⚠</Text>
              <div>
                <Text style={warningTitle}>Approaching Disable Threshold</Text>
                <Text style={warningBody}>
                  After 3 consecutive failures, auto-sync will pause to prevent further
                  errors. You can re-enable it anytime from your dashboard.
                </Text>
              </div>
            </Section>
          )}

          {/* Footer */}
          <Section style={footerSection}>
            <Hr style={divider} />

            <Text style={footerLabel}>Support</Text>
            <Text style={footerLink}>
              <Link href="mailto:support@inkdex.io" style={link}>
                support@inkdex.io
              </Link>
            </Text>

            <Text style={footerLabel}>Instagram</Text>
            <Text style={footerLink}>
              <Link href={`https://instagram.com/${instagramHandle}`} style={link}>
                @{instagramHandle}
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

// Styles - Alert Editorial Aesthetic
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

const alertBorder = {
  height: '8px',
  background: '#EF4444', // Error red
};

const logoSection = {
  padding: '48px 32px 24px',
  textAlign: 'center' as const,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '12px',
};

const logoText = {
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: '14px',
  fontWeight: '600',
  letterSpacing: '0.2em',
  color: '#1A1A1A',
  margin: '0',
};

const statusBadge = {
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: '10px',
  fontWeight: '600',
  letterSpacing: '0.15em',
  color: '#FFFFFF',
  background: '#EF4444',
  padding: '4px 8px',
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
  background: '#EF4444',
  margin: '0 auto',
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
  margin: '0 32px 32px',
};

const errorCard = {
  margin: '0 32px 32px',
  padding: '24px',
  background: '#FEF2F2',
  borderLeft: '4px solid #EF4444',
};

const errorLabel = {
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: '10px',
  fontWeight: '600',
  letterSpacing: '0.15em',
  textTransform: 'uppercase' as const,
  color: '#991B1B',
  margin: '0 0 12px',
};

const errorReason = {
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: '14px',
  fontWeight: '400',
  color: '#991B1B',
  margin: '0 0 8px',
};

const errorMeta = {
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: '12px',
  fontWeight: '300',
  color: '#DC2626',
  margin: '0',
};

const actionSection = {
  margin: '0 32px 32px',
};

const actionLabel = {
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: '10px',
  fontWeight: '600',
  letterSpacing: '0.15em',
  textTransform: 'uppercase' as const,
  color: '#1A1A1A',
  margin: '0 0 12px',
};

const actionText = {
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: '16px',
  fontWeight: '600',
  color: '#1A1A1A',
  margin: '0 0 12px',
};

const actionBody = {
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: '13px',
  fontWeight: '300',
  lineHeight: '1.7',
  color: '#4A4845',
  margin: '0',
};

const ctaSection = {
  padding: '0 32px 48px',
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

const warningCard = {
  margin: '0 32px 48px',
  padding: '24px',
  background: '#FFFBEB',
  borderLeft: '4px solid #F59E0B',
  display: 'flex',
  gap: '16px',
  alignItems: 'flex-start',
};

const warningIcon = {
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: '24px',
  margin: '0',
  lineHeight: '1',
};

const warningTitle = {
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: '12px',
  fontWeight: '600',
  letterSpacing: '0.1em',
  textTransform: 'uppercase' as const,
  color: '#92400E',
  margin: '0 0 8px',
};

const warningBody = {
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: '13px',
  fontWeight: '300',
  lineHeight: '1.7',
  color: '#92400E',
  margin: '0',
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
