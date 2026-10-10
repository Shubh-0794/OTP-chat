/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Phone, KeyRound, CheckCircle2, AlertCircle, RotateCcw, Check } from 'lucide-react';

export default function App() {
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'SEND' | 'VERIFY' | 'SUCCESS'>('SEND');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(30);
  const [error, setError] = useState('');
  const [infoMessage, setInfoMessage] = useState('');

  // Countdown timer for Resend OTP button
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (step === 'VERIFY' && resendCooldown > 0) {
      timer = setInterval(() => {
        setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [step, resendCooldown]);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInfoMessage('');
    setLoading(true);

    try {
      const res = await fetch('/.netlify/functions/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send OTP');
      setStep('VERIFY');
      setResendCooldown(30);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resending || loading || resendCooldown > 0) return;
    setError('');
    setInfoMessage('');
    setResending(true);

    try {
      const res = await fetch('/.netlify/functions/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to resend OTP');
      
      setOtp('');
      setResendCooldown(30);
      setInfoMessage('A new verification code has been dispatched to WhatsApp.');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setResending(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInfoMessage('');
    setLoading(true);

    try {
      const res = await fetch('/.netlify/functions/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, otp }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Verification failed');
      setStep('SUCCESS');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow-sm border border-slate-200 p-8">
        <h2 className="text-2xl font-semibold text-slate-800 mb-6 flex items-center gap-2">
          <Phone className="w-6 h-6 text-emerald-500" />
          WhatsApp Verification
        </h2>

        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-lg flex items-start gap-3 text-sm">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <p>{error}</p>
          </div>
        )}

        {infoMessage && (
          <div className="mb-6 p-4 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg flex items-start gap-3 text-sm">
            <Check className="w-5 h-5 shrink-0 mt-0.5 text-emerald-600" />
            <p>{infoMessage}</p>
          </div>
        )}

        {step === 'SEND' && (
          <form onSubmit={handleSendOtp} className="space-y-4">
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-slate-700 mb-1.5">
                Phone Number (with country code)
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                  +
                </span>
                <input
                  type="tel"
                  id="phone"
                  placeholder="919876543210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/[^0-9]/g, ''))}
                  className="w-full pl-8 pr-4 py-2.5 bg-slate-50 border border-slate-300 text-slate-900 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-colors"
                  required
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={loading || !phone}
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-medium py-2.5 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {loading ? 'Sending...' : 'Send WhatsApp OTP'}
            </button>
          </form>
        )}

        {step === 'VERIFY' && (
          <form onSubmit={handleVerifyOtp} className="space-y-5">
            <div className="text-sm text-slate-600 bg-slate-50 p-3 rounded-lg flex items-center justify-between">
              <div>
                Code sent to <strong className="text-slate-900">+{phone}</strong>
              </div>
              <button
                type="button"
                onClick={() => {
                  setStep('SEND');
                  setError('');
                  setInfoMessage('');
                }}
                className="text-emerald-600 hover:text-emerald-700 font-medium text-xs underline"
              >
                Change number
              </button>
            </div>
            
            <div>
              <label htmlFor="otp" className="block text-sm font-medium text-slate-700 mb-1.5">
                Enter 6-digit Code
              </label>
              <div className="relative">
                <KeyRound className="absolute inset-y-0 left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  id="otp"
                  maxLength={6}
                  placeholder="123456"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, ''))}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-300 text-slate-900 text-center tracking-[0.5em] text-xl font-semibold rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-colors"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || resending || otp.length !== 6}
              className="w-full bg-sky-600 hover:bg-sky-700 text-white font-medium py-2.5 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center shadow-sm"
            >
              {loading ? 'Verifying...' : 'Verify Code'}
            </button>

            {/* Resend OTP Section */}
            <div className="pt-2 border-t border-slate-100 flex flex-col items-center gap-1.5 text-center">
              <span className="text-xs text-slate-500">Didn't receive the code?</span>
              <button
                type="button"
                onClick={handleResendOtp}
                disabled={resending || loading || resendCooldown > 0}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-600 hover:text-emerald-700 disabled:text-slate-400 disabled:cursor-not-allowed transition-colors"
              >
                <RotateCcw className={`w-3.5 h-3.5 ${resending ? 'animate-spin' : ''}`} />
                {resending
                  ? 'Resending OTP...'
                  : resendCooldown > 0
                  ? `Resend OTP in ${resendCooldown}s`
                  : 'Resend OTP'}
              </button>
            </div>
          </form>
        )}

        {step === 'SUCCESS' && (
          <div className="text-center py-6">
            <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-slate-800 mb-2">Verification Successful!</h3>
            <p className="text-slate-600">
              Your WhatsApp number (+{phone}) has been confirmed.
            </p>
            <button
              onClick={() => {
                setStep('SEND');
                setPhone('');
                setOtp('');
                setError('');
                setInfoMessage('');
              }}
              className="mt-6 text-sm text-slate-500 hover:text-slate-700 font-medium"
            >
              Verify another number
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
