/**
 * Welcome Email Template - Editorial Design
 *
 * Sent when an artist completes onboarding (claim or self-add).
 *
 * Design: Bold editorial aesthetic with strong typography, dramatic spacing,
 * and subtle grain texture. Inspired by art magazines and tattoo culture.
 */

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Img as _Img,
  Link,
  Preview,
  Section,
  Text,
  Hr,
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
      <Head>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@900&family=JetBrains+Mono:wght@200;400;600&display=swap');
        `}</style>
      </Head>
      <Preview>{previewText}</Preview>
      <Body style={main}>
        {/* Subtle grain texture overlay */}
        <div style={grainOverlay} />

        <Container style={container}>
          {/* Decorative top border */}
          <div style={topBorder} />

          {/* Minimal logo lockup */}
          <Section style={logoSection}>
            <Text style={logoText}>INKDEX</Text>
            {isPro && <Text style={proLabel}>PRO</Text>}
          </Section>

          {/* Hero headline - bold & dramatic */}
          <Section style={heroSection}>
            <Heading style={h1}>
              Welcome to<br />the Index
            </Heading>
            <div style={accentLine} />
          </Section>

          {/* Personalized greeting */}
          <Text style={greeting}>
            {artistName},
          </Text>

          <Text style={bodyText}>
            Your profile is live. Clients can now discover your work through visual search,
            city browsing, and our curated style galleries.
          </Text>

          {/* CTA Button */}
          <Section style={ctaSection}>
            <Button style={ctaButton} href={profileUrl}>
              View Your Profile →
            </Button>
          </Section>

          {/* Divider */}
          <Hr style={divider} />

          {/* Tips section with refined spacing */}
          <Section style={tipsSection}>
            <Heading style={h2}>Essential Actions</Heading>

            <div style={tipItem}>
              <Text style={tipNumber}>01</Text>
              <div>
                <Text style={tipTitle}>Curate ruthlessly</Text>
                <Text style={tipBody}>
                  Pin your 6 strongest pieces to the top. First impressions matter.
                </Text>
              </div>
            </div>

            <div style={tipItem}>
              <Text style={tipNumber}>02</Text>
              <div>
                <Text style={tipTitle}>Keep it current</Text>
                <Text style={tipBody}>
                  {isPro
                    ? 'Auto-sync enabled. New tattoos appear daily.'
                    : 'Update your portfolio manually from your dashboard.'}
                </Text>
              </div>
            </div>

            <div style={tipItem}>
              <Text style={tipNumber}>03</Text>
              <div>
                <Text style={tipTitle}>Complete your presence</Text>
                <Text style={tipBody}>
                  Add booking details and a bio. Make it easy for clients to reach you.
                </Text>
              </div>
            </div>

            {!isPro && (
              <div style={upgradeCallout}>
                <Text style={upgradeTitle}>Consider Pro</Text>
                <Text style={upgradeBody}>
                  100 images · Auto-sync · Priority ranking · $15/month
                </Text>
              </div>
            )}
          </Section>

          {/* Footer with metadata styling */}
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

// Styles - Editorial Aesthetic
const main = {
  backgroundColor: '#F8F7F5', // Paper white from design system
  fontFamily: "'JetBrains Mono', 'Courier New', monospace",
  position: 'relative' as const,
};

const grainOverlay = {
  position: 'absolute' as const,
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  background: 'url(data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIj48ZmlsdGVyIGlkPSJhIj48ZmVUdXJidWxlbmNlIGJhc2VGcmVxdWVuY3k9Ii43NSIgc3RpdGNoVGlsZXM9InN0aXRjaCIgdHlwZT0iZnJhY3RhbE5vaXNlIi8+PGZlQ29sb3JNYXRyaXggdHlwZT0ic2F0dXJhdGUiIHZhbHVlcz0iMCIvPjwvZmlsdGVyPjxyZWN0IGZpbHRlcj0idXJsKCNhKSIgaGVpZ2h0PSIxMDAlIiB3aWR0aD0iMTAwJSIgb3BhY2l0eT0iLjA1Ii8+PC9zdmc+)',
  pointerEvents: 'none' as const,
  opacity: 0.4,
};

const container = {
  margin: '0 auto',
  padding: '0',
  maxWidth: '600px',
  background: '#FFFFFF',
  position: 'relative' as const,
  zIndex: 1,
};

const topBorder = {
  height: '8px',
  background: 'linear-gradient(90deg, #1A1A1A 0%, #1A1A1A 50%, transparent 50%)',
  backgroundSize: '20px 100%',
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
  background: '#1A1A1A',
  padding: '4px 8px',
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
  background: '#1A1A1A',
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
  transition: 'transform 200ms ease',
};

const divider = {
  border: 'none',
  borderTop: '1px solid #D8D6D2',
  margin: '0',
};

const tipsSection = {
  padding: '48px 32px',
};

const h2 = {
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: '12px',
  fontWeight: '600',
  letterSpacing: '0.15em',
  textTransform: 'uppercase' as const,
  color: '#1A1A1A',
  margin: '0 0 32px',
};

const tipItem = {
  display: 'flex',
  gap: '24px',
  marginBottom: '32px',
  alignItems: 'flex-start',
};

const tipNumber = {
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: '32px',
  fontWeight: '200',
  color: '#D8D6D2',
  margin: '0',
  lineHeight: '1',
  minWidth: '60px',
};

const tipTitle = {
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: '14px',
  fontWeight: '600',
  color: '#1A1A1A',
  margin: '0 0 8px',
};

const tipBody = {
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: '13px',
  fontWeight: '300',
  lineHeight: '1.7',
  color: '#4A4845',
  margin: '0',
};

const upgradeCallout = {
  padding: '24px',
  background: '#F0EFEC',
  borderLeft: '3px solid #1A1A1A',
  marginTop: '48px',
};

const upgradeTitle = {
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: '12px',
  fontWeight: '600',
  letterSpacing: '0.1em',
  textTransform: 'uppercase' as const,
  color: '#1A1A1A',
  margin: '0 0 8px',
};

const upgradeBody = {
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: '13px',
  fontWeight: '300',
  lineHeight: '1.7',
  color: '#4A4845',
  margin: '0',
};

const footerSection = {
  padding: '48px 32px',
  background: '#F8F7F5',
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
