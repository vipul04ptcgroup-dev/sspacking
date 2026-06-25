import { SITE_NAME, SITE_URL } from '@/lib/seo';

export const COMPANY_DETAILS = {
  logoPath: '/Logo.png',
  siteName: SITE_NAME,
  website: SITE_URL,
  legalName: 'SS Packaging',
  addressLines: [
    'Office no. 201-202, Hirubhai Residency, Besides Vedant Hospital, Virar (West) - 401303, Maharashtra, India',
    'Unit no. 13, Pragati Compound, Dongri Pada Road, near Jain Mandir, Poman, Vasai East, Palghar - 401208, Maharashtra, India',
  ],
  contactNumber: '+91 91208 79879',
  email: 'customerservice.sspackaging@gmail.com',
  gstin: '-',
} as const;
