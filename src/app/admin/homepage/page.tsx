'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { Images, Upload, X } from 'lucide-react';
import toast from 'react-hot-toast';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { EmptyState, Spinner } from '@/components/ui';
import { useAuth } from '@/context/auth-context';
import { DEFAULT_HOMEPAGE_BANNERS } from '@/lib/homepage-banner-constants';
import { getHomepageBannerSettings, upsertHomepageBannerSettings } from '@/lib/firestore';
import { uploadHomepageBannerImage } from '@/lib/storage';

type BannerFormState = {
  desktopBanner: string;
  mobileBanner: string;
};

export default function AdminHomepagePage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingDesktop, setUploadingDesktop] = useState(false);
  const [uploadingMobile, setUploadingMobile] = useState(false);
  const [form, setForm] = useState<BannerFormState>({
    desktopBanner: DEFAULT_HOMEPAGE_BANNERS.desktopBanner,
    mobileBanner: DEFAULT_HOMEPAGE_BANNERS.mobileBanner,
  });

  useEffect(() => {
    const load = async () => {
      try {
        const settings = await getHomepageBannerSettings();
        if (settings) {
          setForm({
            desktopBanner: settings.desktopBanner || DEFAULT_HOMEPAGE_BANNERS.desktopBanner,
            mobileBanner: settings.mobileBanner || DEFAULT_HOMEPAGE_BANNERS.mobileBanner,
          });
        }
      } catch {
        toast.error('Failed to load homepage banners.');
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  const handleUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
    bannerType: 'desktop' | 'mobile',
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const setUploading = bannerType === 'desktop' ? setUploadingDesktop : setUploadingMobile;
    const key = bannerType === 'desktop' ? 'desktopBanner' : 'mobileBanner';

    setUploading(true);
    try {
      const imageUrl = await uploadHomepageBannerImage(file, bannerType);
      setForm((current) => ({ ...current, [key]: imageUrl }));
      toast.success(`${bannerType === 'desktop' ? 'Desktop' : 'Mobile'} banner uploaded.`);
    } catch {
      toast.error(`Failed to upload ${bannerType} banner.`);
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  const handleSave = async () => {
    if (uploadingDesktop || uploadingMobile) {
      toast.error('Please wait for uploads to finish.');
      return;
    }

    setSaving(true);
    try {
      await upsertHomepageBannerSettings(form, user?.email || user?.uid || 'admin');
      toast.success('Homepage banners updated.');
    } catch {
      toast.error('Failed to save homepage banners.');
    } finally {
      setSaving(false);
    }
  };

  const renderBannerCard = (
    title: string,
    description: string,
    bannerType: 'desktop' | 'mobile',
    value: string,
  ) => {
    const isUploading = bannerType === 'desktop' ? uploadingDesktop : uploadingMobile;
    const field = bannerType === 'desktop' ? 'desktopBanner' : 'mobileBanner';

    return (
      <section className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
        <div className="mb-5">
          <h2 className="text-lg font-bold text-stone-900">{title}</h2>
          <p className="mt-1 text-sm text-stone-500">{description}</p>
        </div>

        <div className="space-y-4">
          <Input
            id={`${field}-path`}
            label="Image URL or local path"
            value={value}
            onChange={(event) => setForm((current) => ({ ...current, [field]: event.target.value }))}
            placeholder={bannerType === 'desktop' ? '/banner.png' : '/bannermobile.png'}
            helpText="Use an uploaded Firebase image or a local public path like /banner.png."
          />

          {value ? (
            <div className="group relative overflow-hidden rounded-2xl border border-stone-200 bg-stone-50">
              <div className={`relative w-full ${bannerType === 'desktop' ? 'aspect-[16/7]' : 'aspect-[3/4] max-w-sm'}`}>
                <Image
                  src={value}
                  alt={`${title} preview`}
                  fill
                  className="object-cover"
                  unoptimized={value.startsWith('/')}
                />
              </div>
              <button
                type="button"
                onClick={() =>
                  setForm((current) => ({
                    ...current,
                    [field]:
                      bannerType === 'desktop'
                        ? DEFAULT_HOMEPAGE_BANNERS.desktopBanner
                        : DEFAULT_HOMEPAGE_BANNERS.mobileBanner,
                  }))
                }
                className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-black/70 text-white opacity-0 transition group-hover:opacity-100"
                aria-label={`Reset ${title.toLowerCase()}`}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : null}

          <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-stone-300 px-4 py-3 text-sm font-medium text-stone-700 transition hover:border-amber-400 hover:text-amber-600">
            <Upload className="h-4 w-4" />
            <span>{isUploading ? 'Uploading...' : `Upload ${title}`}</span>
            <input
              type="file"
              accept="image/*"
              onChange={(event) => void handleUpload(event, bannerType)}
              className="hidden"
              disabled={isUploading}
            />
          </label>
        </div>
      </section>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-black text-stone-900">Homepage Banners</h1>
          <p className="mt-1 text-stone-500">
            Manage the top desktop and mobile homepage banners. Uploaded images and local `public` paths both work.
          </p>
        </div>
        <Button onClick={() => void handleSave()} loading={saving || uploadingDesktop || uploadingMobile}>
          Save Banners
        </Button>
      </div>

      <EmptyState
        icon={<Images className="h-16 w-16" />}
        title="Homepage top banners"
        description="Set a desktop banner and a mobile banner for the very top of the homepage."
      />

      <div className="grid gap-6 xl:grid-cols-2">
        {renderBannerCard('Desktop Banner', 'Shown on tablet and desktop screens.', 'desktop', form.desktopBanner)}
        {renderBannerCard('Mobile Banner', 'Shown on smaller mobile screens.', 'mobile', form.mobileBanner)}
      </div>
    </div>
  );
}
