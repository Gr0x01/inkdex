/**
 * Subscription Created Email Template - Premium Design
 *
 * Sent when an artist upgrades to Pro.
 *
 * Design: Celebratory editorial aesthetic with warm gold accents,
 * refined typography, and curated feature presentation.
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
  const previewText = `Welcome to Inkdex Pro—premium features unlocked`;

  const nextBillingDate = new Date(
    Date.now() + (plan === 'monthly' ? 30 : 365) * 24 * 60 * 60 * 1000
  ).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

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
          {/* Premium gold border */}
          <div style={premiumBorder} />

          {/* Logo lockup with crown */}
          <Section style={logoSection}>
            <Text style={logoText}>INKDEX</Text>
            <Text style={proLabel}>PRO</Text>
            <Text style={crownIcon}>👑</Text>
          </Section>

          {/* Hero - celebratory */}
          <Section style={heroSection}>
            <Heading style={h1}>
              Welcome to<br />the Pro Tier
            </Heading>
            <div style={accentLine} />
          </Section>

          {/* Personalized greeting */}
          <Text style={greeting}>{artistName},</Text>

          <Text style={bodyText}>
            Your Inkdex Pro subscription is active. You now have access to premium features designed to elevate your visibility and streamline your workflow.
          </Text>

          {/* Features grid - editorial presentation */}
          <Section style={featuresSection}>
            <Text style={sectionLabel}>Premium Features</Text>

            <div style={featureItem}>
              <Text style={featureIcon}>💯</Text>
              <div>
                <Text style={featureTitle}>100 Portfolio Images</Text>
                <Text style={featureBody}>
                  Showcase your best work. 5x more than the free tier.
                </Text>
              </div>
            </div>

            <div style={featureItem}>
              <Text style={featureIcon}>⟳</Text>
              <div>
                <Text style={featureTitle}>Daily Auto-Sync</Text>
                <Text style={featureBody}>
                  New tattoo posts automatically appear on your profile every day.
                </Text>
              </div>
            </div>

            <div style={featureItem}>
              <Text style={featureIcon}>📌</Text>
              <div>
                <Text style={featureTitle}>Strategic Pinning</Text>
                <Text style={featureBody}>
                  Pin up to 6 pieces to the top of your portfolio.
                </Text>
              </div>
            </div>

            <div style={featureItem}>
              <Text style={featureIcon}>↑</Text>
              <div>
                <Text style={featureTitle}>Search Priority</Text>
                <Text style={featureBody}>
                  Ranking boost in all search results and style galleries.
                </Text>
              </div>
            </div>

            <div style={featureItem}>
              <Text style={featureIcon}>👑</Text>
              <div>
                <Text style={featureTitle}>Pro Badge</Text>
                <Text style={featureBody}>
                  Visible indicator on your profile and in search results.
                </Text>
              </div>
            </div>
          </Section>

          {/* Subscription details */}
          <Section style={detailsCard}>
            <Text style={detailsLabel}>Subscription Details</Text>
            <div style={detailsGrid}>
              <div>
                <Text style={detailsMeta}>Plan</Text>
                <Text style={detailsValue}>
                  Pro {plan === 'monthly' ? 'Monthly' : 'Annual'}
                </Text>
              </div>
              <div>
                <Text style={detailsMeta}>Price</Text>
                <Text style={detailsValue}>
                  ${amount}/{plan === 'monthly' ? 'mo' : 'yr'}
                </Text>
              </div>
            </div>
            <div style={detailsSingle}>
              <Text style={detailsMeta}>Next Billing</Text>
              <Text style={detailsValue}>{nextBillingDate}</Text>
            </div>
          </Section>

          {/* CTA */}
          <Section style={ctaSection}>
            <Button style={ctaButton} href={dashboardUrl}>
              View Dashboard →
            </Button>
          </Section>

          {/* Billing management note */}
          <Text style={noteText}>
            Manage your subscription or update payment details in your{' '}
            <Link href={billingPortalUrl} style={noteLink}>
              billing portal
            </Link>
            . Cancel anytime with no fees.
          </Text>

          {/* Footer */}
          <Section style={footerSection}>
            <Hr style={divider} />

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

// Styles - Premium Editorial Aesthetic
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

const premiumBorder = {
  height: '8px',
  background: 'linear-gradient(90deg, #F59E0B 0%, #EAB308 50%, #F59E0B 100%)',
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

const proLabel = {
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: '10px',
  fontWeight: '600',
  letterSpacing: '0.15em',
  color: '#FFFFFF',
  background: 'linear-gradient(135deg, #F59E0B, #EAB308)',
  padding: '4px 8px',
  margin: '0',
};

const crownIcon = {
  fontSize: '20px',
  margin: '0',
};

const heroSection = {
  padding: '24px 32px 48px',
  textAlign: 'center' as const,
};

const h1 = {
  fontFamily: "'Playfair Display', serif",
  fontSize: '56px',
  fontWeight: '900',
  lineHeight: '1.1',
  color: '#1A1A1A',
  margin: '0 0 24px',
  letterSpacing: '-0.02em',
};

const accentLine = {
  width: '80px',
  height: '2px',
  background: 'linear-gradient(90deg, #F59E0B, #EAB308)',
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
  margin: '0 32px 48px',
};

const featuresSection = {
  margin: '0 32px 48px',
};

const sectionLabel = {
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: '10px',
  fontWeight: '600',
  letterSpacing: '0.15em',
  textTransform: 'uppercase' as const,
  color: '#1A1A1A',
  margin: '0 0 24px',
};

const featureItem = {
  display: 'flex',
  gap: '20px',
  marginBottom: '24px',
  alignItems: 'flex-start',
};

const featureIcon = {
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: '28px',
  margin: '0',
  lineHeight: '1',
  minWidth: '50px',
  textAlign: 'center' as const,
};

const featureTitle = {
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: '14px',
  fontWeight: '600',
  color: '#1A1A1A',
  margin: '0 0 6px',
};

const featureBody = {
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: '13px',
  fontWeight: '300',
  lineHeight: '1.7',
  color: '#4A4845',
  margin: '0',
};

const detailsCard = {
  margin: '0 32px 32px',
  padding: '24px',
  background: '#FFFBEB',
  borderLeft: '4px solid #F59E0B',
};

const detailsLabel = {
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: '10px',
  fontWeight: '600',
  letterSpacing: '0.15em',
  textTransform: 'uppercase' as const,
  color: '#92400E',
  margin: '0 0 20px',
};

const detailsGrid = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: '16px',
  marginBottom: '16px',
};

const detailsSingle = {
  marginBottom: '0',
};

const detailsMeta = {
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: '11px',
  fontWeight: '400',
  letterSpacing: '0.05em',
  textTransform: 'uppercase' as const,
  color: '#92400E',
  margin: '0 0 4px',
};

const detailsValue = {
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: '14px',
  fontWeight: '600',
  color: '#78350F',
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
