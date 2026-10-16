/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Phone, KeyRound, CheckCircle2, AlertCircle, RotateCcw, Check } from 'lucide-react';
import confetti from 'canvas-confetti';
import { motion } from 'motion/react';

export default function App() {
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'SEND' | 'VERIFY' | 'SUCCESS'>('SEND');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(30);
  const [error, setError] = useState('');
  const [infoMessage, setInfoMessage] = useState('');
  const [shakeKey, setShakeKey] = useState(0);

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

  const parseResponse = async (res: Response) => {
    const text = await res.text();
    let data: any = {};
    try {
      data = JSON.parse(text);
    } catch {
      if (!res.ok) {
        throw new Error(`Server returned error (${res.status}): ${text.slice(0, 150)}`);
      }
    }
    if (!res.ok) throw new Error(data.error || 'Request failed');
    return data;
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInfoMessage('');
    setLoading(true);

    try {
      const res = await fetch('/api/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });
      const data = await parseResponse(res);
      setStep('VERIFY');
      setResendCooldown(30);
      if (data.message) {
        setInfoMessage(data.message);
      }
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
      const res = await fetch('/api/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });
      const data = await parseResponse(res);
      
      setOtp('');
      setResendCooldown(30);
      setInfoMessage(data.message || 'A new verification code has been dispatched.');
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
      const res = await fetch('/api/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, otp }),
      });
      await parseResponse(res);
      setStep('SUCCESS');
      
      // Trigger canvas-confetti celebration
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 }
      });
    } catch (err: any) {
      setError(err.message);
      setShakeKey((prev) => prev + 1);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0d0a08] flex items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Ambient background golden/amber glows */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-amber-600/20 rounded-full blur-[128px] pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-yellow-500/10 rounded-full blur-[128px] pointer-events-none" />

      {/* Glassy Container */}
      <div className="relative w-full max-w-md bg-gradient-to-b from-white/[0.08] to-white/[0.02] backdrop-blur-2xl rounded-3xl border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] p-8 text-white">
        
        {/* Top corner glowing glass frame accents */}
        <div className="absolute top-0 left-6 w-8 h-[2px] bg-gradient-to-r from-transparent via-amber-400/50 to-transparent" />
        <div className="absolute bottom-0 right-6 w-8 h-[2px] bg-gradient-to-r from-transparent via-amber-400/50 to-transparent" />

        <div className="text-center mb-8">
          <div className="w-12 h-12 mx-auto mb-4 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center shadow-inner">
            <KeyRound className="w-6 h-6 text-amber-400 animate-pulse" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white mb-2 flex items-center justify-center gap-2">
            Verify <span className="text-amber-400">OTP</span>
          </h2>
          <p className="text-sm text-neutral-400">
            {step === 'SEND' 
              ? 'Enter your WhatsApp phone number to receive a secure code'
              : 'Enter the 6-digit security code sent to your device'}
          </p>
        </div>

        {error && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-300 rounded-2xl flex items-start gap-3 text-sm backdrop-blur-md"
          >
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-red-400" />
            <p>{error}</p>
          </motion.div>
        )}

        {infoMessage && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-amber-500/10 border border-amber-500/20 text-amber-200 rounded-2xl flex items-start gap-3 text-sm backdrop-blur-md"
          >
            <Check className="w-5 h-5 shrink-0 mt-0.5 text-amber-400" />
            <p>{infoMessage}</p>
          </motion.div>
        )}

        {step === 'SEND' && (
          <form onSubmit={handleSendOtp} className="space-y-5">
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-neutral-300 mb-2">
                Phone Number (with country code)
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-neutral-400">
                  +
                </span>
                <input
                  type="tel"
                  id="phone"
                  placeholder="919876543210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/[^0-9]/g, ''))}
                  className="w-full pl-9 pr-4 py-3 bg-white/[0.04] border border-white/10 text-white placeholder-neutral-500 rounded-2xl focus:ring-2 focus:ring-amber-400/50 focus:border-amber-400 outline-none transition-all shadow-inner"
                  required
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={loading || !phone}
              className="w-full bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-neutral-950 font-semibold py-3.5 rounded-2xl transition-all shadow-[0_10px_20px_rgba(245,158,11,0.2)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-neutral-950 border-t-transparent rounded-full animate-spin" />
                  Sending Code...
                </span>
              ) : (
                'Verify & Proceed'
              )}
            </button>
          </form>
        )}

        {step === 'VERIFY' && (
          <form onSubmit={handleVerifyOtp} className="space-y-6">
            <div className="text-sm text-neutral-300 bg-white/[0.03] border border-white/10 p-3.5 rounded-2xl flex items-center justify-between backdrop-blur-sm">
              <div>
                Code sent to <strong className="text-amber-400">+{phone}</strong>
              </div>
              <button
                type="button"
                onClick={() => {
                  setStep('SEND');
                  setError('');
                  setInfoMessage('');
                }}
                className="text-amber-400 hover:text-amber-300 font-medium text-xs underline"
              >
                Change
              </button>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-3 text-center">
                Enter 6-digit Code
              </label>
              <motion.div
                key={shakeKey}
                animate={{ x: [0, -10, 10, -10, 10, 0] }}
                transition={{ duration: 0.4 }}
                className="flex justify-center gap-2 sm:gap-3"
              >
                {[0, 1, 2, 3, 4, 5].map((index) => {
                  const digit = otp[index] || '';
                  const isFilled = digit !== '';
                  return (
                    <input
                      key={index}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^0-9]/g, '');
                        const otpArr = otp.split('');
                        if (val.length > 1) {
                          const pasted = val.split('');
                          for (let i = 0; i < pasted.length && index + i < 6; i++) {
                            otpArr[index + i] = pasted[i];
                          }
                          setOtp(otpArr.join('').slice(0, 6));
                          const targetIndex = Math.min(index + pasted.length, 5);
                          document.getElementById(`otp-input-${targetIndex}`)?.focus();
                          return;
                        }

                        otpArr[index] = val;
                        setOtp(otpArr.join('').slice(0, 6));

                        if (val && index < 5) {
                          document.getElementById(`otp-input-${index + 1}`)?.focus();
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Backspace') {
                          e.preventDefault();
                          const otpArr = otp.split('');
                          if (digit) {
                            otpArr[index] = '';
                          } else if (index > 0) {
                            otpArr[index - 1] = '';
                            document.getElementById(`otp-input-${index - 1}`)?.focus();
                          }
                          setOtp(otpArr.join('').slice(0, 6));
                        }
                      }}
                      id={`otp-input-${index}`}
                      autoFocus={index === 0}
                      className={`w-11 h-12 sm:w-12 sm:h-14 rounded-2xl border text-center text-xl sm:text-2xl font-bold transition-all duration-300 outline-none ${
                        isFilled
                          ? 'border-amber-400 bg-amber-500/10 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.2)] scale-105'
                          : 'border-white/10 bg-white/[0.04] text-white focus:border-amber-400 focus:bg-white/[0.08]'
                      }`}
                    />
                  );
                })}
              </motion.div>
            </div>

            <button
              type="submit"
              disabled={loading || resending || otp.length !== 6}
              className="w-full bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-neutral-950 font-semibold py-3.5 rounded-2xl transition-all shadow-[0_10px_20px_rgba(245,158,11,0.2)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-neutral-950 border-t-transparent rounded-full animate-spin" />
                  Verifying Code...
                </span>
              ) : (
                'Verify & Secured'
              )}
            </button>

            {/* Resend OTP Section */}
            <div className="pt-2 border-t border-white/10 flex flex-col items-center gap-1.5 text-center">
              <span className="text-xs text-neutral-400">Didn't receive the code?</span>
              <button
                type="button"
                onClick={handleResendOtp}
                disabled={resending || loading || resendCooldown > 0}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-amber-400 hover:text-amber-300 disabled:text-neutral-600 disabled:cursor-not-allowed transition-colors"
              >
                <RotateCcw className={`w-3.5 h-3.5 ${resending ? 'animate-spin' : ''}`} />
                {resending
                  ? 'Resending...'
                  : resendCooldown > 0
                  ? `Resend in ${resendCooldown}s`
                  : 'Resend OTP'}
              </button>
            </div>
          </form>
        )}

        {step === 'SUCCESS' && (
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-center py-6"
          >
            <div className="w-16 h-16 mx-auto mb-4 rounded-3xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
              <CheckCircle2 className="w-10 h-10 text-amber-400" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Verified Successfully</h3>
            <p className="text-sm text-neutral-400 mb-6">
              Your security verification code has been confirmed.
            </p>
            <button
              onClick={() => {
                setStep('SEND');
                setPhone('');
                setOtp('');
                setError('');
                setInfoMessage('');
              }}
              className="text-xs font-medium text-amber-400 hover:text-amber-300 underline"
            >
              Verify another number
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
