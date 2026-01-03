/**
 * Downgrade Warning Email Template - Transparent Design
 *
 * Sent 7 days before Pro subscription ends (cancellation or payment failure).
 *
 * Design: Clear, editorial aesthetic with structured information hierarchy.
 * Empathetic tone with transparent change disclosure.
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
  dashboardUrl: _dashboardUrl = 'https://inkdex.io/dashboard',
  to = 'artist@example.com',
}: DowngradeWarningEmailProps) {
  const previewText = `Your Pro subscription ends ${endDate}—here's what changes`;

  const imagesToHide = Math.max(0, portfolioImageCount - 20);

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
          {/* Neutral gray border */}
          <div style={neutralBorder} />

          {/* Logo */}
          <Section style={logoSection}>
            <Text style={logoText}>INKDEX</Text>
          </Section>

          {/* Hero - informative, not alarming */}
          <Section style={heroSection}>
            <Heading style={h1}>
              Subscription<br />Ending Soon
            </Heading>
            <div style={accentLine} />
          </Section>

          {/* Personalized greeting */}
          <Text style={greeting}>{artistName},</Text>

          <Text style={bodyText}>
            Your Inkdex Pro subscription ends on <strong>{endDate}</strong>.
            We want to be transparent about what happens to your profile when you return to the free tier.
          </Text>

          {/* What changes section - transparent and clear */}
          <Section style={changeSection}>
            <Text style={sectionLabel}>Changes to Your Profile</Text>

            <div style={changeItem}>
              <Text style={changeIcon}>→</Text>
              <div>
                <Text style={changeTitle}>Portfolio Limit Returns</Text>
                <Text style={changeBody}>
                  Your first 20 images remain visible.
                  {imagesToHide > 0 && ` ${imagesToHide} images will be hidden but not deleted.`}
                </Text>
              </div>
            </div>

            <div style={changeItem}>
              <Text style={changeIcon}>→</Text>
              <div>
                <Text style={changeTitle}>Auto-Sync Pauses</Text>
                <Text style={changeBody}>
                  New Instagram posts won't sync automatically. You can still update manually.
                </Text>
              </div>
            </div>

            <div style={changeItem}>
              <Text style={changeIcon}>→</Text>
              <div>
                <Text style={changeTitle}>Pins Reset</Text>
                <Text style={changeBody}>
                  Pinned images return to chronological order.
                </Text>
              </div>
            </div>

            <div style={changeItem}>
              <Text style={changeIcon}>→</Text>
              <div>
                <Text style={changeTitle}>Search Ranking Adjusts</Text>
                <Text style={changeBody}>
                  Pro ranking boost removed. Standard search placement resumes.
                </Text>
              </div>
            </div>

            <div style={changeItem}>
              <Text style={changeIcon}>→</Text>
              <div>
                <Text style={changeTitle}>Pro Badge Removed</Text>
                <Text style={changeBody}>
                  Crown indicator no longer displays on your profile.
                </Text>
              </div>
            </div>
          </Section>

          {/* What stays section - reassurance */}
          <Section style={staysCard}>
            <Text style={staysLabel}>What Stays</Text>
            <ul style={staysList}>
              <li style={staysItem}>Profile remains live and searchable</li>
              <li style={staysItem}>Manual portfolio updates (up to 20 images)</li>
              <li style={staysItem}>Profile customization (bio, booking link)</li>
              <li style={staysItem}>Verified status (if applicable)</li>
            </ul>
          </Section>

          {/* CTA */}
          <Section style={ctaSection}>
            <Button style={ctaButton} href={billingPortalUrl}>
              Reactivate Pro Subscription →
            </Button>
          </Section>

          {/* Reactivation note */}
          <Text style={noteText}>
            Want to keep Pro features? Reactivate anytime from your{' '}
            <Link href={billingPortalUrl} style={noteLink}>
              billing portal
            </Link>
            . No penalties or re-setup required.
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

// Styles - Transparent Editorial Aesthetic
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

const neutralBorder = {
  height: '8px',
  background: '#8B8985',
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
  background: '#8B8985',
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

const changeSection = {
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

const changeItem = {
  display: 'flex',
  gap: '20px',
  marginBottom: '24px',
  alignItems: 'flex-start',
};

const changeIcon = {
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: '24px',
  margin: '0',
  lineHeight: '1',
  minWidth: '40px',
  color: '#8B8985',
};

const changeTitle = {
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: '14px',
  fontWeight: '600',
  color: '#1A1A1A',
  margin: '0 0 6px',
};

const changeBody = {
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: '13px',
  fontWeight: '300',
  lineHeight: '1.7',
  color: '#4A4845',
  margin: '0',
};

const staysCard = {
  margin: '0 32px 32px',
  padding: '24px',
  background: '#F0EFEC',
  borderLeft: '4px solid #10B981',
};

const staysLabel = {
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: '10px',
  fontWeight: '600',
  letterSpacing: '0.15em',
  textTransform: 'uppercase' as const,
  color: '#065F46',
  margin: '0 0 16px',
};

const staysList = {
  margin: '0',
  padding: '0 0 0 20px',
};

const staysItem = {
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: '13px',
  fontWeight: '300',
  lineHeight: '2',
  color: '#065F46',
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
