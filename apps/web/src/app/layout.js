import '@fontsource-variable/instrument-sans';
import '../styles/globals.css';
import '../styles/tokens.css';
import '../styles/base.css';
import '../styles/site.css';
import '../styles/admin.css';
import { SITE_URL } from '@/lib/api';

export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: 'Portfolio', template: '%s | Portfolio' },
  description: 'I design, build, and grow digital experiences.',
  icons: { icon: '/icon.png', apple: '/apple-icon.png' },
  openGraph: { type: 'website', siteName: 'Portfolio', images: ['/opengraph-image'] },
  twitter: { card: 'summary_large_image', images: ['/opengraph-image'] },
};

export const viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f3f4f0' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0e14' },
  ],
};

// Runs before first paint so there is no flash. Default is the light editorial theme.
const themeScript = `try{var t=localStorage.getItem('theme');if(t==='dark'||t==='light'){document.documentElement.dataset.theme=t}else{document.documentElement.dataset.theme='light'}}catch(e){document.documentElement.dataset.theme='light'}`;

export default function RootLayout({ children }) {
  return (
    <html lang="en" data-theme="light" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        {process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN ? (
          <script defer data-domain={process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN} src="https://plausible.io/js/script.js" />
        ) : null}
      </head>
      <body>{children}</body>
    </html>
  );
}
