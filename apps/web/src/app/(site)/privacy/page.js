import { apiGet } from '@/lib/api';

export const metadata = { title: 'Privacy', description: 'How inquiry data and analytics are handled.', alternates: { canonical: '/privacy' } };

export default async function Privacy() {
  const site = await apiGet('/site');
  const email = site?.profile?.email;
  return (
    <div className="container page prose-page">
      <header className="page-head"><h1>Privacy notice</h1></header>
      <div className="prose">
        <h2>What I collect</h2>
        <p>When you send a message through the contact form I collect your name, email address, the topic you chose and your message. I also store a one-way hash of your network address and a shortened browser identifier to help detect abuse. Nothing else is collected through the form.</p>
        <h2>Why</h2>
        <p>Only to reply to you and to protect the form from spam. I do not sell or share your details, and I do not add you to any mailing list.</p>
        <h2>Who can see it</h2>
        <p>Only the site owner through a protected admin area. Your message is also sent to the owner by email through a transactional email provider.</p>
        <h2>How long I keep it</h2>
        <p>Messages are kept for up to 12 months after the last reply, then deleted. You can ask me to delete yours sooner.</p>
        <h2>Analytics and cookies</h2>
        <p>This site does not use advertising or tracking cookies. If analytics are switched on they use a privacy-friendly service that records page views without cookies or personal data. Your light or dark theme choice is stored in your browser only.</p>
        <h2>Your rights</h2>
        <p>You can ask to see, correct or delete the data I hold about you{email ? <> by emailing <a href={`mailto:${email}`}>{email}</a></> : ' by using the contact form'}.</p>
      </div>
    </div>
  );
}
