/**
 * Subscription Created Email Template
 *
 * Sent when an artist upgrades to Pro.
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

interface SubscriptionCreatedEmailProps {
  artistName: string;
  plan: 'monthly' | 'yearly';
  amount: number;
  dashboardUrl: string;
  billingPortalUrl: string;
  to: string;
}

export default function SubscriptionCreatedEmail({
  artistName = 'Artist',
  plan = 'monthly',
  amount = 15,
  dashboardUrl = 'https://inkdex.io/dashboard',
  billingPortalUrl = 'https://inkdex.io/billing',
  to = 'artist@example.com',
}: SubscriptionCreatedEmailProps) {
  const previewText = `Welcome to Inkdex Pro! Your subscription is now active.`;

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
          <Heading style={h1}>Welcome to Pro! 👑</Heading>

          {/* Main Content */}
          <Text style={text}>Hi {artistName},</Text>

          <Text style={text}>
            Your Inkdex Pro subscription is now active. You've unlocked all premium features:
          </Text>

          {/* Features List */}
          <Section style={featureSection}>
            <ul style={list}>
              <li style={listItem}>
                ✨ <strong>Unlimited portfolio images</strong> (vs 20 on free tier)
              </li>
              <li style={listItem}>
                🔄 <strong>Auto-sync new tattoo posts</strong> daily from Instagram
              </li>
              <li style={listItem}>
                📌 <strong>Pin your best work</strong> to appear first (up to 6 images)
              </li>
              <li style={listItem}>
                🚀 <strong>Search ranking boost</strong> to appear higher in results
              </li>
              <li style={listItem}>
                👑 <strong>Pro badge</strong> on your profile and search results
              </li>
              <li style={listItem}>
                📊 <strong>Analytics dashboard</strong> (coming soon)
              </li>
            </ul>
          </Section>

          {/* Subscription Details */}
          <Section style={detailsSection}>
            <Text style={detailsText}>
              <strong>Plan:</strong> Inkdex Pro {plan === 'monthly' ? 'Monthly' : 'Annual'}
            </Text>
            <Text style={detailsText}>
              <strong>Price:</strong> ${amount}/{plan === 'monthly' ? 'month' : 'year'}
            </Text>
            <Text style={detailsText}>
              <strong>Next billing date:</strong>{' '}
              {new Date(
                Date.now() + (plan === 'monthly' ? 30 : 365) * 24 * 60 * 60 * 1000
              ).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </Text>
          </Section>

          {/* CTA */}
          <Section style={buttonContainer}>
            <Button style={button} href={dashboardUrl}>
              Go to Dashboard
            </Button>
          </Section>

          {/* Billing Management */}
          <Text style={text}>
            You can manage your subscription, update payment methods, or cancel anytime from your{' '}
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
  fontSize: '32px',
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

const featureSection = {
  margin: '24px 0',
  padding: '20px',
  backgroundColor: '#fef3c7',
  borderRadius: '8px',
};

const list = {
  margin: '0',
  padding: '0 0 0 20px',
};

const listItem = {
  color: '#404040',
  fontSize: '15px',
  lineHeight: '28px',
  margin: '8px 0',
};

const detailsSection = {
  margin: '24px 0',
  padding: '16px',
  backgroundColor: '#f5f5f5',
  borderRadius: '4px',
};

const detailsText = {
  color: '#404040',
  fontSize: '15px',
  lineHeight: '24px',
  margin: '4px 0',
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
