/**
 * Email Unsubscribe Page
 *
 * Allows users to unsubscribe from email notifications
 * Required for CAN-SPAM, GDPR, and CASL compliance
 */

import { Suspense } from 'react';
import { UnsubscribeForm } from '@/components/email/UnsubscribeForm';

export const metadata = {
  title: 'Unsubscribe from Emails | Inkdex',
  description: 'Manage your email preferences or unsubscribe from Inkdex notifications',
  robots: 'noindex, nofollow',
};

export default function UnsubscribePage() {
  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Manage Email Preferences</h1>
        <p className="text-gray-600 mb-6">
          Control which emails you receive from Inkdex, or unsubscribe from all emails.
        </p>

        <Suspense fallback={<div className="text-center py-8">Loading...</div>}>
          <UnsubscribeForm />
        </Suspense>
      </div>
    </main>
  );
}
