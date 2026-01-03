/**
 * Sync Failed Email Template
 *
 * Sent when Instagram auto-sync fails (OAuth revoked, rate limit, etc.).
 */

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
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
  const previewText = `Your Instagram sync failed ${failureCount > 1 ? `${failureCount} times` : 'recently'}`;

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Logo */}
          <Section style={logoSection}>
            <Img
              src="https://inkdex.io/logo.png"
              width="120"
              height="30"
              alt="Inkdex"
              style={logo}
            />
          </Section>

          {/* Header */}
          <Heading style={h1}>Instagram Sync Issue</Heading>

          {/* Main Content */}
          <Text style={text}>Hi {artistName},</Text>

          <Text style={text}>
            We couldn't sync your Instagram posts to your Inkdex profile.
          </Text>

          {/* Error Details */}
          <Section style={errorSection}>
            <Text style={errorText}>
              <strong>Reason:</strong> {failureReason}
            </Text>
            {failureCount > 1 && (
              <Text style={errorText}>
                <strong>Failed attempts:</strong> {failureCount} consecutive failures
              </Text>
            )}
          </Section>

          {/* Action Required */}
          {needsReauth ? (
            <>
              <Text style={text}>
                <strong>Action Required:</strong> You need to reconnect your Instagram account.
              </Text>
              <Text style={text}>
                This usually happens when you've changed your Instagram password, revoked app permissions, or Instagram requires re-authentication.
              </Text>
            </>
          ) : (
            <Text style={text}>
              We'll automatically retry syncing. If the issue persists, you may need to manually update your portfolio or contact support.
            </Text>
          )}

          {/* CTA */}
          <Section style={buttonContainer}>
            <Button style={button} href={dashboardUrl}>
              {needsReauth ? 'Reconnect Instagram' : 'Go to Dashboard'}
            </Button>
          </Section>

          {/* Auto-disable warning */}
          {failureCount >= 2 && (
            <Section style={warningSection}>
              <Text style={warningText}>
                ⚠️ <strong>Note:</strong> If we can't sync after 3 consecutive failures, auto-sync will be temporarily disabled to prevent further errors. You can re-enable it anytime from your dashboard.
              </Text>
            </Section>
          )}

          {/* Footer */}
          <Text style={footer}>
            Need help? Contact us at{' '}
            <Link href="mailto:support@inkdex.io" style={link}>
              support@inkdex.io
            </Link>
          </Text>

          <Text style={footer}>
            Instagram:{' '}
            <Link href={`https://instagram.com/${instagramHandle}`} style={link}>
              @{instagramHandle}
            </Link>
          </Text>

          <Text style={footer}>
            Don&apos;t want to receive these emails?{' '}
            <Link href={EMAIL_CONFIG.unsubscribeUrl(to)} style={link}>
              Unsubscribe
            </Link>
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

// Styles
const main = {
  backgroundColor: '#ffffff',
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Oxygen-Sans,Ubuntu,Cantarell,"Helvetica Neue",sans-serif',
};

const container = {
  margin: '0 auto',
  padding: '20px 0 48px',
  maxWidth: '580px',
};

const logoSection = {
  padding: '20px 0',
};

const logo = {
  margin: '0 auto',
};

const h1 = {
  color: '#1a1a1a',
  fontSize: '28px',
  fontWeight: 'bold',
  margin: '40px 0',
  padding: '0',
  textAlign: 'center' as const,
};

const text = {
  color: '#404040',
  fontSize: '16px',
  lineHeight: '26px',
  margin: '16px 0',
};

const errorSection = {
  margin: '24px 0',
  padding: '16px',
  backgroundColor: '#fef2f2',
  borderLeft: '4px solid #ef4444',
  borderRadius: '4px',
};

const errorText = {
  color: '#991b1b',
  fontSize: '15px',
  lineHeight: '24px',
  margin: '4px 0',
};

const warningSection = {
  margin: '24px 0',
  padding: '16px',
  backgroundColor: '#fffbeb',
  borderLeft: '4px solid #f59e0b',
  borderRadius: '4px',
};

const warningText = {
  color: '#92400e',
  fontSize: '14px',
  lineHeight: '22px',
  margin: '0',
};

const buttonContainer = {
  textAlign: 'center' as const,
  margin: '32px 0',
};

const button = {
  backgroundColor: '#1a1a1a',
  borderRadius: '4px',
  color: '#fff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '12px 24px',
};

const footer = {
  color: '#8898aa',
  fontSize: '14px',
  lineHeight: '24px',
  margin: '32px 0 0',
  textAlign: 'center' as const,
};

const link = {
  color: '#1a1a1a',
  textDecoration: 'underline',
};
