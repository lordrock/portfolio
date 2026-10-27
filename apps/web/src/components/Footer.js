import Link from 'next/link';
import SocialIcon from './SocialIcon';
import { socialLinks } from '@/lib/socials';

export default function Footer({ profile }) {
  const year = new Date().getFullYear();
  return (
    <footer className="site-footer">
      <div className="container footer-grid">
        <div>
          <p className="footer-name">{profile?.name || 'Portfolio'}</p>
          <p className="footer-line">{profile?.headline || 'I design, build, and grow digital experiences.'}</p>
          {socialLinks.length ? (
            <ul className="footer-socials" aria-label="Social profiles">
              {socialLinks.map((social) => (
                <li key={social.platform}>
                  <a href={social.url} target="_blank" rel="noopener noreferrer" aria-label={`${social.label} (opens in a new tab)`} title={social.label}>
                    <SocialIcon name={social.platform} />
                  </a>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
        <nav aria-label="Footer">
          <ul className="footer-links">
            <li><Link href="/work">Work</Link></li>
            <li><Link href="/services">Services</Link></li>
            <li><Link href="/about">About</Link></li>
            <li><Link href="/contact">Contact</Link></li>
            <li><Link href="/privacy">Privacy</Link></li>
          </ul>
        </nav>
      </div>
      <div className="container footer-base">
        <p>© {year} {profile?.name || ''}. All rights reserved.</p>
      </div>
    </footer>
  );
}
