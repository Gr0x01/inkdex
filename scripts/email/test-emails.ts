/**
 * Test Email Sending Script
 *
 * Usage: npx tsx scripts/email/test-emails.ts [your-email@example.com]
 *
 * Sends all email templates to the specified address for testing.
 */

import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function testEmails(recipientEmail: string) {
  const baseUrl = 'http://localhost:3000';

  const emailTypes = [
    { type: 'welcome', label: 'Welcome Email (Free)' },
    { type: 'welcome_pro', label: 'Welcome Email (Pro)' },
    { type: 'sync_failed', label: 'Sync Failed (Warning)' },
    { type: 'sync_failed_reauth', label: 'Sync Failed (Re-auth Required)' },
    { type: 'subscription_created', label: 'Subscription Created (Monthly)' },
    { type: 'subscription_created_annual', label: 'Subscription Created (Annual)' },
    { type: 'downgrade_warning', label: 'Downgrade Warning' },
  ];

  console.log(`\n📧 Sending test emails to: ${recipientEmail}\n`);

  for (const { type, label } of emailTypes) {
    try {
      const response = await fetch(`${baseUrl}/api/dev/test-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type,
          to: recipientEmail,
        }),
      });

      const result = await response.json();

      if (result.success) {
        console.log(`✅ ${label}: Sent (ID: ${result.emailId || 'N/A'})`);
      } else {
        console.error(`❌ ${label}: Failed - ${result.error}`);
      }

      // Rate limit: wait 1 second between emails
      await new Promise((resolve) => setTimeout(resolve, 1000));
    } catch (error) {
      console.error(`❌ ${label}: Error -`, error instanceof Error ? error.message : error);
    }
  }

  console.log(`\n✨ Done! Check your inbox at ${recipientEmail}\n`);
}

// Get email from command line argument
const recipientEmail = process.argv[2];

if (!recipientEmail || !recipientEmail.includes('@')) {
  console.error('Usage: npx tsx scripts/email/test-emails.ts your-email@example.com');
  process.exit(1);
}

// Check if dev server is running
const baseUrl = 'http://localhost:3000';
console.log('🔍 Checking if dev server is running...');

fetch(`${baseUrl}/api/health`)
  .then(() => {
    console.log('✅ Dev server is running\n');
    return testEmails(recipientEmail);
  })
  .catch(() => {
    console.error('❌ Dev server is not running. Start it with: npm run dev');
    process.exit(1);
  });
