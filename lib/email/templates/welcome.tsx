/**
 * Welcome Email Template
 *
 * Sent when an artist completes onboarding (claim or self-add).
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

interface WelcomeEmailProps {
  artistName: string;
  profileUrl: string;
  instagramHandle: string;
  isPro?: boolean;
  to: string;
}

export default function WelcomeEmail({
  artistName = 'Artist',
  profileUrl = 'https://inkdex.io',
  instagramHandle = '',
  isPro = false,
  to = 'artist@example.com',
}: WelcomeEmailProps) {
  const previewText = `Welcome to Inkdex, ${artistName}! Your profile is now live.`;

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
          <Heading style={h1}>Welcome to Inkdex{isPro && ' Pro'}!</Heading>

          {/* Main Content */}
          <Text style={text}>Hi {artistName},</Text>

          <Text style={text}>
            Your profile is now live and searchable on Inkdex. Clients can discover your work through visual search, city browsing, and style pages.
          </Text>

          {/* Profile Link */}
          <Section style={buttonContainer}>
            <Button style={button} href={profileUrl}>
              View Your Profile
            </Button>
          </Section>

          {/* Quick Tips */}
          <Section style={tipSection}>
            <Heading style={h2}>Quick Tips:</Heading>
            <ul style={list}>
              <li style={listItem}>
                <strong>Curate your portfolio:</strong> Pin your best work to appear first
              </li>
              <li style={listItem}>
                <strong>Keep it fresh:</strong> {isPro ? 'Your profile auto-syncs daily with your Instagram posts' : 'Manually update your portfolio from your dashboard'}
              </li>
              <li style={listItem}>
                <strong>Complete your profile:</strong> Add booking info and a bio to help clients reach you
              </li>
              {!isPro && (
                <li style={listItem}>
                  <strong>Upgrade to Pro:</strong> Get unlimited portfolio images, auto-sync, and search ranking boosts for $15/month
                </li>
              )}
            </ul>
          </Section>

          {/* Footer */}
          <Text style={footer}>
            Questions? Reply to this email or contact us at{' '}
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
  fontSize: '32px',
  fontWeight: 'bold',
  margin: '40px 0',
  padding: '0',
  textAlign: 'center' as const,
};

const h2 = {
  color: '#1a1a1a',
  fontSize: '20px',
  fontWeight: 'bold',
  margin: '30px 0 15px',
};

const text = {
  color: '#404040',
  fontSize: '16px',
  lineHeight: '26px',
  margin: '16px 0',
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

const tipSection = {
  margin: '32px 0',
  padding: '20px',
  backgroundColor: '#f5f5f5',
  borderRadius: '8px',
};

const list = {
  margin: '0',
  padding: '0 0 0 20px',
};

const listItem = {
  color: '#404040',
  fontSize: '15px',
  lineHeight: '24px',
  margin: '8px 0',
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
