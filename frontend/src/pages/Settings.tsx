import { useState, type FormEvent } from 'react'
import { fetchProgress, getSettings, isConfigured, saveSettings } from '../api/client'
import { APP_VERSION, CHANGELOG } from '../changelog'
import { flushPending, getPending, getRejected, requeueRejected } from '../store/pending'

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
  const [refused, setRefused] = useState(() => getRejected().length)

  async function retryRefused() {
    setBusy(true)
    requeueRejected()
    const flushed = await flushPending()
    setRefused(getRejected().length)
    setStatus(flushed.remaining === 0 && getRejected().length === 0 ? { ok: true, text: 'All sessions uploaded.' } : { ok: false, text: flushed.error ?? 'Some sessions were refused again. Make sure the server is updated to the latest version.' })
    setBusy(false)
  }

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
      {refused > 0 && (
        <div className="notice warn">
          <p>The server refused {refused} {refused === 1 ? 'session' : 'sessions'}, most likely because it has not been updated yet. They are kept on this device.</p>
          <button className="button" onClick={() => void retryRefused()} disabled={busy}>Try uploading again</button>
        </div>
      )}
      {waiting > 0 && <p className="quiet">{waiting} {waiting === 1 ? 'session is' : 'sessions are'} saved on this device and not uploaded yet.</p>}
      <details>
        <summary className="quiet">App version {APP_VERSION} · build {__BUILD__}</summary>
        {CHANGELOG.map((v) => (
          <div key={v.version}>
            <h3>{v.version} <span className="quiet">· {v.date}</span></h3>
            <ul>{v.changes.map((c) => <li key={c}>{c}</li>)}</ul>
          </div>
        ))}
      </details>
    </section>
  )
}
