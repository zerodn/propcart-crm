'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, MapPin, Users, TrendingUp } from 'lucide-react';
import { PhoneForm } from '@/components/auth/phone-form';
import { OtpForm } from '@/components/auth/otp-form';
import { useAuth } from '@/providers/auth-provider';
import { useI18n } from '@/providers/i18n-provider';
import { LanguageSwitcher } from '@/components/language-switcher';
import type { User, Workspace } from '@/types';

type Step = 'phone' | 'otp';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const { t } = useI18n();
  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');

  const handlePhoneSuccess = (submittedPhone: string) => {
    setPhone(submittedPhone);
    setStep('otp');
  };

  const handleOtpSuccess = (
    accessToken: string,
    refreshToken: string,
    user: User,
    workspace: Workspace,
  ) => {
    login(accessToken, refreshToken, user, workspace);
    router.push('/dashboard');
  };

  return (
    /* NO overflow-hidden here — the dropdown must escape to display correctly */
    <div className="relative min-h-screen flex">

      {/* ─── Background layer (overflow-hidden only here to clip bg elements) ─── */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* City night sky gradient */}
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(180deg, #020c1a 0%, #04122a 35%, #071d3d 60%, #0b2448 80%, #0f2a52 100%)' }}
        />

        {/* Land parcel grid pattern (lower half) */}
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMax slice">
          <defs>
            <pattern id="landGrid" x="0" y="0" width="90" height="90" patternUnits="userSpaceOnUse">
              <path d="M 90 0 L 0 0 0 90" fill="none" stroke="#CFAF6E" strokeWidth="0.6" strokeOpacity="0.07" />
            </pattern>
          </defs>
          <rect x="0" y="520" width="1440" height="380" fill="url(#landGrid)" />
        </svg>

        {/* City skyline SVG */}
        <svg
          className="absolute bottom-0 w-full"
          viewBox="0 0 1440 560"
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="xMidYMax slice"
        >
          {/* ── Back-layer buildings (lighter navy, partially hidden by front) ── */}
          <g fill="#0d2340">
            <rect x="0"    y="300" width="160" height="260" />
            <rect x="140"  y="240" width="80"  height="320" />
            <rect x="290"  y="200" width="110" height="360" />
            <rect x="500"  y="230" width="90"  height="330" />
            <rect x="700"  y="185" width="110" height="375" />
            <rect x="920"  y="215" width="95"  height="345" />
            <rect x="1100" y="195" width="120" height="365" />
            <rect x="1290" y="250" width="150" height="310" />
          </g>

          {/* ── Front-layer buildings (very dark, silhouette) ── */}
          <g fill="#050f1e">
            <rect x="20"   y="360" width="70"  height="200" />
            <rect x="100"  y="300" width="55"  height="260" />
            <rect x="165"  y="260" width="65"  height="300" />
            <rect x="255"  y="310" width="75"  height="250" />
            <rect x="360"  y="255" width="60"  height="305" />
            <rect x="435"  y="210" width="70"  height="350" />
            <rect x="540"  y="270" width="65"  height="290" />
            {/* Tall landmark L tower */}
            <rect x="618"  y="180" width="72"  height="380" />
            {/* Super-tall center tower with spire */}
            <rect x="710"  y="130" width="58"  height="430" />
            <rect x="722"  y="110" width="34"  height="25"  />
            <rect x="730"  y="92"  width="18"  height="22"  />
            <polygon points="739,72 749,92 730,92" fill="#050f1e" />
            <rect x="780"  y="215" width="82"  height="345" />
            <rect x="876"  y="260" width="65"  height="300" />
            <rect x="958"  y="240" width="77"  height="320" />
            <rect x="1068" y="230" width="80"  height="330" />
            <rect x="1172" y="270" width="60"  height="290" />
            <rect x="1254" y="248" width="72"  height="312" />
            <rect x="1345" y="285" width="95"  height="275" />
          </g>

          {/* ── Ground strip ── */}
          <rect x="0" y="542" width="1440" height="18" fill="#020a18" />

          {/* ── Gold windows (dim) ── */}
          <g fill="#CFAF6E" fillOpacity="0.38">
            <rect x="26"   y="375" width="8"  height="10" /> <rect x="42"   y="375" width="8"  height="10" />
            <rect x="108"  y="315" width="7"  height="9"  /> <rect x="121"  y="325" width="7"  height="9"  />
            <rect x="170"  y="275" width="7"  height="9"  /> <rect x="183"  y="285" width="7"  height="9"  />
            <rect x="260"  y="325" width="7"  height="9"  />
            <rect x="365"  y="270" width="7"  height="9"  /> <rect x="378"  y="283" width="7"  height="9"  />
            <rect x="441"  y="225" width="8"  height="10" /> <rect x="455"  y="225" width="8"  height="10" />
            <rect x="441"  y="242" width="8"  height="10" />
            <rect x="545"  y="285" width="7"  height="9"  />
            {/* Tall L tower windows */}
            <rect x="624"  y="195" width="8"  height="10" /> <rect x="638"  y="195" width="8"  height="10" />
            <rect x="624"  y="212" width="8"  height="10" /> <rect x="638"  y="212" width="8"  height="10" />
            <rect x="624"  y="229" width="8"  height="10" /> <rect x="638"  y="229" width="8"  height="10" />
            <rect x="624"  y="246" width="8"  height="10" />
            {/* Super-tall tower windows — densest lighting */}
            <rect x="716"  y="145" width="8"  height="10" /> <rect x="730"  y="145" width="8"  height="10" />
            <rect x="716"  y="162" width="8"  height="10" /> <rect x="730"  y="162" width="8"  height="10" />
            <rect x="716"  y="179" width="8"  height="10" /> <rect x="730"  y="179" width="8"  height="10" />
            <rect x="716"  y="196" width="8"  height="10" />
            <rect x="730"  y="213" width="8"  height="10" />
            <rect x="716"  y="230" width="8"  height="10" /> <rect x="730"  y="230" width="8"  height="10" />
            <rect x="785"  y="230" width="8"  height="10" /> <rect x="799"  y="230" width="8"  height="10" />
            <rect x="785"  y="247" width="8"  height="10" />
            <rect x="881"  y="275" width="7"  height="9"  /> <rect x="894"  y="275" width="7"  height="9"  />
            <rect x="963"  y="255" width="8"  height="10" />
            <rect x="1074" y="245" width="8"  height="10" /> <rect x="1088" y="245" width="8"  height="10" />
            <rect x="1074" y="262" width="8"  height="10" />
            <rect x="1178" y="285" width="7"  height="9"  />
            <rect x="1260" y="263" width="8"  height="10" /> <rect x="1274" y="263" width="8"  height="10" />
            <rect x="1351" y="300" width="8"  height="10" /> <rect x="1366" y="300" width="8"  height="10" />
          </g>

          {/* ── Bright gold accent windows ── */}
          <g fill="#FFD98A" fillOpacity="0.65">
            <rect x="455"  y="242" width="8"  height="10" />
            <rect x="716"  y="213" width="8"  height="10" />
            <rect x="638"  y="246" width="8"  height="10" />
            <rect x="730"  y="196" width="8"  height="10" />
          </g>

          {/* ── Subtle street-glow halos ── */}
          <g fill="#CFAF6E" fillOpacity="0.08">
            <ellipse cx="200"  cy="547" rx="70"  ry="6" />
            <ellipse cx="500"  cy="547" rx="65"  ry="6" />
            <ellipse cx="760"  cy="547" rx="90"  ry="7" />
            <ellipse cx="1050" cy="547" rx="65"  ry="6" />
            <ellipse cx="1370" cy="547" rx="55"  ry="6" />
          </g>
        </svg>

        {/* Subtle ambient glow */}
        <div
          className="absolute inset-0 login-gradient-pulse"
          style={{ background: 'linear-gradient(135deg, rgba(11,31,58,0.25) 0%, rgba(15,42,82,0.15) 50%, rgba(2,8,20,0.35) 100%)' }}
        />

        {/* Floating glass orbs */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="login-bubble-1 absolute top-[8%] left-[10%] w-44 h-44 rounded-full"
            style={{ background: 'rgba(207,175,110,0.04)', backdropFilter: 'blur(4px)', border: '1px solid rgba(207,175,110,0.09)' }} />
          <div className="login-bubble-2 absolute top-[52%] left-[4%] w-28 h-28 rounded-full"
            style={{ background: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(3px)', border: '1px solid rgba(255,255,255,0.06)', animationDelay: '-4s' }} />
          <div className="login-bubble-3 absolute top-[18%] left-[42%] w-20 h-20 rounded-full"
            style={{ background: 'rgba(207,175,110,0.05)', backdropFilter: 'blur(3px)', border: '1px solid rgba(207,175,110,0.11)', animationDelay: '-8s' }} />
        </div>
      </div>

      {/* ─── Bottom bar ─── */}
      <div className="absolute bottom-6 left-6 z-30">
        <LanguageSwitcher dropUp dark />
      </div>
      <div className="absolute bottom-6 right-6 z-30">
        <a
          href="https://propcart.vn/privacy-policy"
          target="_blank"
          rel="noopener noreferrer"
          className="text-white/40 text-xs hover:text-white/70 transition-colors underline-offset-2 hover:underline"
        >
          Privacy Policy
        </a>
      </div>

      {/* ─── Left Branding (desktop, 2/3) ─── */}
      <div className="relative z-10 hidden lg:flex flex-col justify-center pl-20 pr-12 flex-1">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-10">
          <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-[#CFAF6E]/15 border border-[#CFAF6E]/30 backdrop-blur-sm shadow-lg">
            <Building2 className="h-6 w-6 text-[#CFAF6E]" />
          </div>
          <span className="text-white font-bold text-2xl tracking-wide font-heading">
            PropCart CRM
          </span>
        </div>

        {/* Main heading — no forced linebreak, wraps naturally */}
        <h1 className="font-heading font-bold text-white leading-snug drop-shadow-lg"
          style={{ fontSize: 'clamp(1.75rem, 2.5vw, 2.5rem)', maxWidth: '560px' }}>
          Không gian làm việc lý tưởng cho bất động sản chuyên nghiệp
        </h1>
        <p className="mt-5 text-white/60 text-base leading-relaxed" style={{ maxWidth: '460px' }}>
          Nền tảng CRM đa thuê bao — quản lý khách hàng, dự án và nhân sự trong một hệ thống thống nhất.
        </p>

        {/* Stats row */}
        <div className="mt-10 flex gap-5" style={{ maxWidth: '420px' }}>
          {[
            { icon: Users, stat: '100k+', label: 'Người dùng' },
            { icon: MapPin, stat: '50k+', label: 'Bất động sản' },
            { icon: TrendingUp, stat: '99.9%', label: 'Uptime' },
          ].map(({ icon: Icon, stat, label }) => (
            <div key={label} className="flex-1 flex flex-col items-center text-center py-4 px-3 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
              <Icon className="h-5 w-5 text-[#CFAF6E] mb-2" />
              <span className="text-white font-bold text-xl leading-none font-heading">{stat}</span>
              <span className="text-white/45 text-xs mt-1.5">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ─── Right Login Panel (≈1/3 screen) ─── */}
      <div className="relative z-10 flex items-center justify-center w-full lg:w-[480px] xl:w-[520px] min-h-screen p-6 lg:py-12 lg:px-10">
        {/* Darker panel overlay to contrast the card */}
        <div className="absolute inset-0 hidden lg:block" style={{ background: 'rgba(2,10,22,0.55)', backdropFilter: 'blur(2px)' }} />
        {/* Left divider line */}
        <div className="absolute inset-y-0 left-0 w-px hidden lg:block" style={{ background: 'linear-gradient(180deg, transparent, rgba(207,175,110,0.25) 30%, rgba(207,175,110,0.25) 70%, transparent)' }} />

        <div className="relative z-10 w-full max-w-sm lg:max-w-none login-card-anim">

          {/* Mobile logo */}
          <div className="flex lg:hidden flex-col items-center mb-8">
            <div className="flex items-center justify-center w-14 h-14 bg-[#CFAF6E]/15 backdrop-blur-sm rounded-2xl border border-[#CFAF6E]/30 mb-3 shadow-lg">
              <Building2 className="h-7 w-7 text-[#CFAF6E]" />
            </div>
            <p className="text-lg font-bold text-white font-heading">PropCart CRM</p>
            <p className="text-sm text-white/55 mt-0.5">Không gian làm việc lý tưởng</p>
          </div>

          {/* Glass Card */}
          <div className="glass-card rounded-[20px] px-8 py-9" style={{ background: 'rgba(255,255,255,0.10)', borderColor: 'rgba(255,255,255,0.22)' }}>

            {/* Brand header row (image above form) */}
            <div className="flex items-center gap-4 mb-7 pb-6 border-b border-white/12">
              <div className="flex-shrink-0 flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-[#CFAF6E]/30 to-[#CFAF6E]/10 border border-[#CFAF6E]/35 shadow-lg">
                <Building2 className="h-7 w-7 text-[#CFAF6E]" />
              </div>
              <div className="min-w-0">
                <h2 className="text-lg font-bold text-white font-heading leading-tight">
                  {step === 'phone' ? 'Đăng nhập vào PropCart' : t('auth.login.enterOtp')}
                </h2>
                <p className="text-xs text-white/50 mt-1 leading-relaxed">
                  {step === 'phone' ? t('auth.login.enterPhone') : t('auth.login.verifyOtp')}
                </p>
              </div>
            </div>

            {/* Form */}
            {step === 'phone' ? (
              <PhoneForm onSuccess={handlePhoneSuccess} />
            ) : (
              <OtpForm
                phone={phone}
                onSuccess={handleOtpSuccess}
                onBack={() => setStep('phone')}
              />
            )}

            {/* Step dots */}
            <div className="flex items-center justify-center gap-2 mt-7">
              <div className={`h-1.5 rounded-full transition-all duration-300 ${step === 'phone' ? 'w-6 bg-[#CFAF6E]' : 'w-2 bg-white/20'}`} />
              <div className={`h-1.5 rounded-full transition-all duration-300 ${step === 'otp' ? 'w-6 bg-[#CFAF6E]' : 'w-2 bg-white/20'}`} />
            </div>
          </div>

          <p className="text-center text-xs text-white/30 mt-5">
            © 2026 PropCart CRM · Dành cho nội bộ
          </p>
        </div>
      </div>
    </div>
  );
}
