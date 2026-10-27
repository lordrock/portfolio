'use client';
import { useEffect, useRef, useState } from 'react';

export default function ContactForm({ services = [], defaultTopic = '' }) {
  const [status, setStatus] = useState('idle'); // idle | sending | sent | error
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState('');
  const startedAt = useRef(0);
  const statusRef = useRef(null);
  useEffect(() => { startedAt.current = Date.now(); }, []);
  useEffect(() => { if (status === 'sent' || status === 'error') statusRef.current?.focus(); }, [status]);

  async function onSubmit(e) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    const payload = {
      name: String(f.get('name') || ''),
      email: String(f.get('email') || ''),
      topic: String(f.get('topic') || ''),
      message: String(f.get('message') || ''),
      consent: f.get('consent') === 'on',
      website: String(f.get('website') || ''),
      startedAt: startedAt.current,
    };
    const nextErrors = {};
    if (payload.name.trim().length < 2) nextErrors.name = 'Please enter your name';
    if (!/^\S+@\S+\.\S+$/.test(payload.email.trim())) nextErrors.email = 'Please enter a valid email';
    if (payload.message.trim().length < 10) nextErrors.message = 'Please write a little more (10+ characters)';
    if (!payload.consent) nextErrors.consent = 'Please confirm that I may use your details to reply';
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      setStatus('error');
      requestAnimationFrame(() => form.querySelector('[aria-invalid="true"]')?.focus());
      return;
    }
    setStatus('sending');
    setErrors({});
    try {
      const res = await fetch('/api/v1/public/inquiries', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (res.ok) { setStatus('sent'); return; }
      const data = await res.json().catch(() => ({}));
      if (res.status === 400 && data.details) {
        setErrors(Object.fromEntries(data.details.map((d) => [d.path, d.message])));
      } else if (res.status === 429) {
        setErrors({ form: data.error || 'Too many messages. Please try again later.' });
      } else {
        setErrors({ form: 'The message could not be sent. Please try again, or email me directly.' });
      }
      setStatus('error');
    } catch {
      setErrors({ form: 'Could not reach the server. Check your connection and try again.' });
      setStatus('error');
    }
  }

  if (status === 'sent') {
    return (
      <div className="form-success" role="status" tabIndex={-1} ref={statusRef}>
        <h2>Message sent</h2>
        <p>Thanks for writing. I read every message and will reply to the email address you gave.</p>
      </div>
    );
  }

  const fieldError = (name) => (errors[name] ? <p className="field-error" id={`${name}-error`}>{errors[name]}</p> : null);
  const aria = (name) => ({ 'aria-invalid': errors[name] ? true : undefined, 'aria-describedby': errors[name] ? `${name}-error` : undefined });

  return (
    <form onSubmit={onSubmit} noValidate className="contact-form">
      {errors.form ? <p className="form-error" role="alert" tabIndex={-1} ref={statusRef}>{errors.form}</p> : null}

      <div className="contact-form-row">
        <div className="field">
          <label htmlFor="name">Your name</label>
          <input id="name" name="name" type="text" autoComplete="name" required minLength={2} maxLength={100} placeholder="How should I address you?" {...aria('name')} />
          {fieldError('name')}
        </div>
        <div className="field">
          <label htmlFor="email">Email address</label>
          <input id="email" name="email" type="email" inputMode="email" autoComplete="email" required maxLength={200} placeholder="you@example.com" {...aria('email')} />
          {fieldError('email')}
        </div>
      </div>
      <div className="field">
        <label htmlFor="topic">What do you need help with?</label>
        <select id="topic" name="topic" defaultValue={defaultTopic}>
          <option value="">Choose a topic (optional)</option>
          {services.map((s) => <option key={s.slug} value={s.title}>{s.title}</option>)}
          <option value="Something else">Something else</option>
        </select>
      </div>
      <div className="field">
        <label htmlFor="message">Message</label>
        <textarea id="message" name="message" rows={7} required minLength={10} maxLength={4000} placeholder="A short overview of the idea, audience, timeline and what you need help with…" value={message} onChange={(e) => setMessage(e.target.value)} {...aria('message')} />
        <p className="field-hint">What you’re building, who it’s for, and when you’d like to start. <span aria-live="polite">{message.length} / 4000</span></p>
        {fieldError('message')}
      </div>

      {/* Honeypot: hidden from people, tempting to bots */}
      <div className="hp" aria-hidden="true">
        <label htmlFor="website">Leave this empty</label>
        <input id="website" name="website" tabIndex={-1} autoComplete="off" />
      </div>

      <div className="field field-check">
        <input id="consent" name="consent" type="checkbox" required {...aria('consent')} />
        <label htmlFor="consent">I agree that my details are used to reply to this message. See the <a href="/privacy">privacy notice</a>.</label>
        {fieldError('consent')}
      </div>

      <button type="submit" className="btn btn-primary" disabled={status === 'sending'}>
        {status === 'sending' ? 'Sending…' : 'Send project enquiry'}
      </button>
    </form>
  );
}
