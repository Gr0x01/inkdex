/**
 * Downgrade Warning Email Template
 *
 * Sent 7 days before Pro subscription ends (cancellation or payment failure).
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

interface DowngradeWarningEmailProps {
  artistName: string;
  endDate: string;
  portfolioImageCount: number;
  billingPortalUrl: string;
  dashboardUrl: string;
  to: string;
}

export default function DowngradeWarningEmail({
  artistName = 'Artist',
  endDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString(),
  portfolioImageCount = 50,
  billingPortalUrl = 'https://inkdex.io/billing',
  dashboardUrl = 'https://inkdex.io/dashboard',
  to = 'artist@example.com',
}: DowngradeWarningEmailProps) {
  const previewText = `Your Pro subscription ends ${endDate}. Here's what will happen.`;

  const imagesToRemove = Math.max(0, portfolioImageCount - 20);

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
          <Heading style={h1}>Your Pro Subscription is Ending</Heading>

          {/* Main Content */}
          <Text style={text}>Hi {artistName},</Text>

          <Text style={text}>
            Your Inkdex Pro subscription will end on <strong>{endDate}</strong>. We wanted to let
            you know what will happen to your profile.
          </Text>

          {/* What Changes */}
          <Section style={changesSection}>
            <Heading style={h2}>What will change:</Heading>
            <ul style={list}>
              <li style={listItem}>
                📸 <strong>Portfolio limit:</strong> Your first 20 images will remain visible
                {imagesToRemove > 0 && ` (${imagesToRemove} images will be hidden)`}
              </li>
              <li style={listItem}>
                🔄 <strong>Auto-sync disabled:</strong> New Instagram posts won't sync automatically
              </li>
              <li style={listItem}>
                📌 <strong>Pinned images unpinned:</strong> Images will return to chronological order
              </li>
              <li style={listItem}>
                🚀 <strong>Search ranking:</strong> Pro boost will be removed
              </li>
              <li style={listItem}>
                👑 <strong>Pro badge removed:</strong> Crown badge won't display on your profile
              </li>
            </ul>
          </Section>

          {/* What Stays */}
          <Section style={staysSection}>
            <Heading style={h2}>What stays:</Heading>
            <ul style={list}>
              <li style={listItem}>✅ Your profile remains live and searchable</li>
              <li style={listItem}>
                ✅ Manual portfolio updates (up to 20 images)
              </li>
              <li style={listItem}>✅ Profile customization (bio, booking link)</li>
              <li style={listItem}>✅ Verified badge</li>
            </ul>
          </Section>

          {/* CTA */}
          <Section style={buttonContainer}>
            <Button style={button} href={billingPortalUrl}>
              Reactivate Pro
            </Button>
          </Section>

          <Text style={text}>
            Want to keep Pro features? You can reactivate your subscription anytime from your{' '}
            <Link href={billingPortalUrl} style={link}>
              billing portal
            </Link>
            .
          </Text>

          {/* Footer */}
          <Text style={footer}>
            Questions? Contact us at{' '}
            <Link href="mailto:support@inkdex.io" style={link}>
              support@inkdex.io
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

const h2 = {
  color: '#1a1a1a',
  fontSize: '18px',
  fontWeight: 'bold',
  margin: '20px 0 12px',
};

const text = {
  color: '#404040',
  fontSize: '16px',
  lineHeight: '26px',
  margin: '16px 0',
};

const changesSection = {
  margin: '32px 0',
  padding: '20px',
  backgroundColor: '#fef2f2',
  borderLeft: '4px solid #ef4444',
  borderRadius: '4px',
};

const staysSection = {
  margin: '32px 0',
  padding: '20px',
  backgroundColor: '#f0fdf4',
  borderLeft: '4px solid #22c55e',
  borderRadius: '4px',
};

const list = {
  margin: '0',
  padding: '0 0 0 20px',
};

const listItem = {
  color: '#404040',
  fontSize: '15px',
  lineHeight: '26px',
  margin: '8px 0',
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
