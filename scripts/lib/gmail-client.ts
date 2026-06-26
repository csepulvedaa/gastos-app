import { google } from 'googleapis'

export interface GmailMessage {
  id: string
  subject: string
  body: string
}

function createAuth() {
  const auth = new google.auth.OAuth2(
    process.env.GMAIL_CLIENT_ID,
    process.env.GMAIL_CLIENT_SECRET,
  )
  auth.setCredentials({ refresh_token: process.env.GMAIL_REFRESH_TOKEN })
  return auth
}

function decodeBase64(data: string): string {
  return Buffer.from(data.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf-8')
}

/** Strips HTML tags and decodes common HTML entities to plain text. */
function htmlToText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, '')   // remove <style> blocks
    .replace(/<script[\s\S]*?<\/script>/gi, '')  // remove <script> blocks
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/?(p|div|tr|td|th|li)[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')                    // strip remaining tags
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ').replace(/&oacute;/g, 'ó').replace(/&ntilde;/g, 'ñ')
    .replace(/&#\d+;/g, ' ')
    .replace(/[ \t]+/g, ' ')                     // collapse horizontal whitespace
    .replace(/\n{3,}/g, '\n\n')                  // collapse blank lines
    .trim()
}

function extractBody(payload: any): string {
  // Prefer text/plain, fall back to text/html stripped to plain text
  if (!payload) return ''

  if (payload.mimeType === 'text/plain' && payload.body?.data) {
    return decodeBase64(payload.body.data)
  }

  if (payload.parts?.length) {
    const plainPart = payload.parts.find((p: any) => p.mimeType === 'text/plain')
    if (plainPart?.body?.data) return decodeBase64(plainPart.body.data)

    // Try HTML part and strip tags
    const htmlPart = payload.parts.find((p: any) => p.mimeType === 'text/html')
    if (htmlPart?.body?.data) return htmlToText(decodeBase64(htmlPart.body.data))

    // Recurse into multipart (e.g. multipart/alternative inside multipart/mixed)
    for (const part of payload.parts) {
      const text = extractBody(part)
      if (text) return text
    }
  }

  if (payload.body?.data) {
    const raw = decodeBase64(payload.body.data)
    return payload.mimeType === 'text/html' ? htmlToText(raw) : raw
  }

  return ''
}

function getHeader(headers: Array<{ name: string; value: string }> | undefined, name: string): string {
  return headers?.find(h => h.name.toLowerCase() === name.toLowerCase())?.value ?? ''
}

export async function getBCIEmails(hoursBack = 48): Promise<GmailMessage[]> {
  const auth = createAuth()
  const gmail = google.gmail({ version: 'v1', auth })

  // Gmail search: from BCI, within the last N hours
  const afterSeconds = Math.floor((Date.now() - hoursBack * 3600 * 1000) / 1000)
  const query = `from:contacto@bci.cl after:${afterSeconds}`

  const list = await gmail.users.messages.list({
    userId: 'me',
    q: query,
    maxResults: 50,
  })

  if (!list.data.messages?.length) return []

  const messages = await Promise.all(
    list.data.messages.map(async ({ id }) => {
      const msg = await gmail.users.messages.get({
        userId: 'me',
        id: id!,
        format: 'full',
      })

      const subject = getHeader(msg.data.payload?.headers as any, 'Subject')
      const body = extractBody(msg.data.payload)

      return { id: id!, subject, body }
    })
  )

  return messages
}
