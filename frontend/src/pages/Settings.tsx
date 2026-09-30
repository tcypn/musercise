import { useState, type FormEvent } from 'react'
import { fetchProgress, getSettings, isConfigured, saveSettings } from '../api/client'
import { flushPending, getPending } from '../store/pending'

export function Settings() {
  const [form, setForm] = useState(getSettings)
  const [status, setStatus] = useState<{ ok: boolean; text: string }>()
  const [busy, setBusy] = useState(false)

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    saveSettings(form)
    setBusy(true)
    if (!isConfigured()) {
      setStatus({ ok: true, text: 'Saved. Progress stays in this browser only.' })
      setBusy(false)
      return
    }
    try {
      await fetchProgress()
      const flushed = await flushPending()
      setStatus({ ok: true, text: flushed.remaining ? `Connected, but ${flushed.remaining} sessions are still waiting to upload.` : 'Connected. Progress will sync automatically.' })
    } catch (error) {
      setStatus({ ok: false, text: error instanceof Error ? error.message : 'Connection failed.' })
    }
    setBusy(false)
  }

  const waiting = getPending().length
  return (
    <section className="practice">
      <h1>Settings</h1>
      <p className="lede">
        Point the app at your own server to keep progress across devices. Leave the address empty to keep everything in this browser.
      </p>
      <form onSubmit={onSubmit} className="form">
        <label>
          Server address
          <input type="url" inputMode="url" placeholder="https://yourname.pythonanywhere.com" value={form.apiUrl} onChange={(e) => setForm({ ...form, apiUrl: e.target.value })} autoComplete="off" />
        </label>
        <label>
          Access token
          <input type="password" value={form.token} onChange={(e) => setForm({ ...form, token: e.target.value })} autoComplete="off" />
        </label>
        <p className="quiet">The token is stored only in this browser. It is the same value as API_TOKEN on the server.</p>
        <button className="button primary" disabled={busy}>{busy ? 'Testing…' : 'Save and test'}</button>
      </form>
      {status && <p className={`notice ${status.ok ? '' : 'warn'}`} role="status">{status.text}</p>}
      {waiting > 0 && <p className="quiet">{waiting} {waiting === 1 ? 'session is' : 'sessions are'} saved on this device and not uploaded yet.</p>}
    </section>
  )
}
