import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Save, Store, Link2, Phone, ShieldCheck, Eye, EyeOff, LogOut, MapPin, Locate } from 'lucide-react';
import * as settingsAPI from '../../api/settings.js';
import * as authAPI from '../../api/auth.js';
import { useAuth } from '../../auth/AuthContext.jsx';
import { toast } from 'react-hot-toast';

const Field = ({ label, hint, error, children }) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
    {children}
    {hint && !error && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
    {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
  </div>
);

const Section = ({ icon: Icon, title, subtitle, children }) => (
  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
    <div className="flex items-start gap-3 mb-6">
      <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0">
        <Icon size={17} className="text-indigo-600" />
      </div>
      <div>
        <h3 className="font-semibold text-gray-900 text-sm">{title}</h3>
        <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>
      </div>
    </div>
    <div className="space-y-4">{children}</div>
  </div>
);

const CTA_ROUTES = [
  { value: '/bills/new',    label: 'New Bill  (/bills/new)' },
  { value: '/customers',    label: 'Customers  (/customers)' },
  { value: '/products',     label: 'Products  (/products)' },
  { value: '/reports',      label: 'Reports  (/reports)' },
];

// ── Change Password Section ───────────────────────────────────
const ChangePasswordSection = () => {
  const { logout } = useAuth();
  const [showCur, setShowCur] = useState(false);
  const [showNew, setShowNew] = useState(false);

  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm();

  const mutation = useMutation({
    mutationFn: (d) => authAPI.changePassword(d.currentPassword, d.newPassword),
    onSuccess: () => {
      toast.success('Password changed! Logging out…');
      reset();
      setTimeout(() => logout(), 1500);
    },
    onError: (err) => toast.error(err?.response?.data?.error || 'Failed to change password'),
  });

  return (
    <Section icon={ShieldCheck} title="Security" subtitle="Change your login password — all devices will be logged out">
      <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
        <Field label="Current Password" error={errors.currentPassword?.message}>
          <div className="relative">
            <input
              type={showCur ? 'text' : 'password'}
              {...register('currentPassword', { required: 'Required' })}
              className="w-full px-3 py-2 pe-10 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="••••••••"
              autoComplete="current-password"
            />
            <button type="button" onClick={() => setShowCur(v => !v)}
              className="absolute inset-e-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              {showCur ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
        </Field>

        <Field label="New Password" error={errors.newPassword?.message}>
          <div className="relative">
            <input
              type={showNew ? 'text' : 'password'}
              {...register('newPassword', {
                required: 'Required',
                minLength: { value: 8, message: 'At least 8 characters' },
              })}
              className="w-full px-3 py-2 pe-10 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Minimum 8 characters"
              autoComplete="new-password"
            />
            <button type="button" onClick={() => setShowNew(v => !v)}
              className="absolute inset-e-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              {showNew ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
        </Field>

        <Field label="Confirm New Password" error={errors.confirmPassword?.message}>
          <input
            type="password"
            {...register('confirmPassword', {
              required: 'Required',
              validate: (v) => v === watch('newPassword') || 'Passwords do not match',
            })}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="Repeat new password"
            autoComplete="new-password"
          />
        </Field>

        <button
          type="submit"
          disabled={mutation.isPending}
          className="flex items-center gap-2 bg-red-600 text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-red-700 transition-colors disabled:opacity-50"
        >
          <ShieldCheck size={15} />
          {mutation.isPending ? 'Changing…' : 'Change Password'}
        </button>
      </form>
    </Section>
  );
};

// ── Logout button ─────────────────────────────────────────────
const LogoutButton = () => {
  const { logout } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    setLoading(true);
    await logout();
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex items-center justify-between">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
          <LogOut size={17} className="text-red-500" />
        </div>
        <div>
          <h3 className="font-semibold text-gray-900 text-sm">Sign Out</h3>
          <p className="text-xs text-gray-400 mt-0.5">End your current session on this device</p>
        </div>
      </div>
      <button
        onClick={handleLogout}
        disabled={loading}
        className="flex items-center gap-2 text-sm font-semibold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 px-4 py-2 rounded-xl transition-colors disabled:opacity-50"
      >
        <LogOut size={14} />
        {loading ? 'Signing out…' : 'Sign Out'}
      </button>
    </div>
  );
};

// ── Shop Location Section ─────────────────────────────────────
const ShopLocationSection = ({ currentLat, currentLng, currentRadius }) => {
  const qc = useQueryClient();
  const [locating, setLocating] = useState(false);
  const { register, handleSubmit, setValue, watch, formState: { isDirty } } = useForm({
    defaultValues: {
      shopLat:            currentLat    ?? '',
      shopLng:            currentLng    ?? '',
      attendanceRadiusM:  currentRadius ?? 100,
    },
  });

  const lat = watch('shopLat');
  const lng = watch('shopLng');

  const mutation = useMutation({
    mutationFn: (d) => settingsAPI.updateLocation({
      shopLat:           d.shopLat           ? parseFloat(d.shopLat)           : null,
      shopLng:           d.shopLng           ? parseFloat(d.shopLng)           : null,
      attendanceRadiusM: d.attendanceRadiusM ? parseInt(d.attendanceRadiusM)   : 100,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['shop-settings'] });
      toast.success('Shop location saved!');
    },
    onError: (err) => toast.error(err?.response?.data?.error || 'Failed to save location'),
  });

  const detectLocation = () => {
    if (!navigator.geolocation) return toast.error('GPS not supported in this browser');
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setValue('shopLat', pos.coords.latitude.toFixed(7),  { shouldDirty: true });
        setValue('shopLng', pos.coords.longitude.toFixed(7), { shouldDirty: true });
        setLocating(false);
        toast.success('Location detected! Save to apply.');
      },
      () => { setLocating(false); toast.error('Could not detect location — enable GPS and try again'); },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <Section icon={MapPin} title="Shop Location" subtitle="Used for employee geo-fenced attendance — employees must be within radius to mark attendance">
      <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">

        <button
          type="button"
          onClick={detectLocation}
          disabled={locating}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 border-dashed border-indigo-200 text-indigo-600 font-semibold text-sm hover:bg-indigo-50 transition-colors disabled:opacity-50"
        >
          <Locate size={16} className={locating ? 'animate-spin' : ''} />
          {locating ? 'Detecting location…' : 'Auto-detect from this device (recommended)'}
        </button>

        {lat && lng && (
          <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 border border-emerald-100 rounded-xl text-xs text-emerald-700 font-medium">
            <MapPin size={13} className="shrink-0" />
            Location set: {parseFloat(lat).toFixed(5)}, {parseFloat(lng).toFixed(5)}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Field label="Latitude">
            <input
              type="number" step="any"
              {...register('shopLat')}
              placeholder="e.g. 31.5204"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </Field>
          <Field label="Longitude">
            <input
              type="number" step="any"
              {...register('shopLng')}
              placeholder="e.g. 74.3587"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </Field>
        </div>

        <Field label="Attendance Radius (meters)" hint="Employee must be within this distance from the shop. 100m recommended for indoor shops.">
          <input
            type="number" min="10" max="5000"
            {...register('attendanceRadiusM')}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </Field>

        <button
          type="submit"
          disabled={mutation.isPending || !isDirty}
          className="flex items-center gap-2 bg-indigo-600 text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Save size={15} />
          {mutation.isPending ? 'Saving…' : 'Save Location'}
        </button>
      </form>
    </Section>
  );
};

// ─────────────────────────────────────────────────────────────
const Settings = () => {
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['shop-settings'],
    queryFn:  settingsAPI.getSettings,
    staleTime: 5 * 60 * 1000,
  });

  const { register, handleSubmit, reset, formState: { errors, isDirty } } = useForm({
    defaultValues: { shopName: '', tagline: '', ctaText: '', ctaRoute: '/bills/new', whatsappPhone: '' },
  });

  useEffect(() => {
    if (data?.data) {
      const s = data.data;
      reset({
        shopName:      s.shop_name      || '',
        tagline:       s.tagline        || '',
        ctaText:       s.cta_text       || 'New Bill',
        ctaRoute:      s.cta_route      || '/bills/new',
        whatsappPhone: s.whatsapp_phone || '',
      });
    }
  }, [data, reset]);

  const mutation = useMutation({
    mutationFn: settingsAPI.updateSettings,
    onSuccess: (res) => {
      qc.setQueryData(['shop-settings'], res);
      qc.invalidateQueries({ queryKey: ['shop-settings'] });
      toast.success('Settings saved!');
      reset(undefined, { keepValues: true });
    },
    onError: (err) => {
      toast.error(err?.response?.data?.error || 'Failed to save settings');
    },
  });

  const onSubmit = (values) => mutation.mutate(values);

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="h-48 bg-gray-100 rounded-2xl animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-5">
    <form onSubmit={handleSubmit(onSubmit)} className="contents">

      <Section icon={Store} title="Shop Identity" subtitle="Name and tagline shown across the app">
        <Field
          label="Shop Name"
          error={errors.shopName?.message}
        >
          <input
            {...register('shopName', { required: 'Shop name is required' })}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl
              focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            placeholder="My Print Shop"
          />
        </Field>

        <Field
          label="Tagline"
          hint="Optional — shown below the shop name on the dashboard"
        >
          <input
            {...register('tagline')}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl
              focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            placeholder="Professional Printing Solutions"
          />
        </Field>
      </Section>

      <Section icon={Phone} title="Contact" subtitle="Business WhatsApp number shown on printed invoices">
        <Field
          label="WhatsApp Number"
          hint="Enter in Pakistani format e.g. 03239062418 — shown on invoices so customers can contact you"
        >
          <input
            {...register('whatsappPhone')}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl
              focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            placeholder="03239062418"
          />
        </Field>
      </Section>

      <Section icon={Link2} title="Primary Action" subtitle="The main button shown on the dashboard hero strip">
        <Field
          label="Button Label"
          hint="Text displayed on the CTA button"
          error={errors.ctaText?.message}
        >
          <input
            {...register('ctaText', { required: 'Button label is required' })}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl
              focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            placeholder="New Bill"
          />
        </Field>

        <Field label="Button Destination" hint="Where clicking the CTA navigates to">
          <select
            {...register('ctaRoute')}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl
              focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
          >
            {CTA_ROUTES.map(({ value, label }) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </Field>
      </Section>

      <div className="flex items-center justify-between pt-1">
        {isDirty && (
          <p className="text-xs text-amber-600">You have unsaved changes</p>
        )}
        <div className="ml-auto">
          <button
            type="submit"
            disabled={mutation.isPending || !isDirty}
            className="flex items-center gap-2 bg-indigo-600 text-white text-sm font-semibold
              px-5 py-2.5 rounded-xl hover:bg-indigo-700 transition-colors
              disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save size={15} />
            {mutation.isPending ? 'Saving…' : 'Save Settings'}
          </button>
        </div>
      </div>

    </form>

    <ShopLocationSection
      currentLat={data?.data?.shop_lat}
      currentLng={data?.data?.shop_lng}
      currentRadius={data?.data?.attendance_radius_m}
    />
    <ChangePasswordSection />
    <LogoutButton />
    </div>
  );
};

export default Settings;
