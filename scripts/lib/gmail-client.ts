import { google } from 'googleapis'

export interface GmailMessage {
  id: string
  subject: string
  body: string
  sender: string   // From: address of the original email
}

function createAuth(refreshToken: string) {
  const auth = new google.auth.OAuth2(
    process.env.GMAIL_CLIENT_ID,
    process.env.GMAIL_CLIENT_SECRET,
  )
  auth.setCredentials({ refresh_token: refreshToken })
  return auth
}

function decodeBase64(data: string): string {
  return Buffer.from(data.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf-8')
}

/** Strips HTML tags and decodes common HTML entities to plain text. */
function htmlToText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/?(p|div|tr|td|th|li)[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ').replace(/&oacute;/g, 'ó').replace(/&ntilde;/g, 'ñ')
    .replace(/&#\d+;/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function extractBody(payload: any): string {
  if (!payload) return ''

  if (payload.mimeType === 'text/plain' && payload.body?.data) {
    return decodeBase64(payload.body.data)
  }

  if (payload.parts?.length) {
    const plainPart = payload.parts.find((p: any) => p.mimeType === 'text/plain')
    if (plainPart?.body?.data) return decodeBase64(plainPart.body.data)

    const htmlPart = payload.parts.find((p: any) => p.mimeType === 'text/html')
    if (htmlPart?.body?.data) return htmlToText(decodeBase64(htmlPart.body.data))

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

/**
 * Fetches bank notification emails from Gmail for the given senders.
 * @param senders   List of bank sender addresses to search for
 * @param hoursBack How many hours back to search (default 48)
 * @param refreshToken Gmail OAuth refresh token (defaults to GMAIL_REFRESH_TOKEN env var)
 */
export async function getBankEmails(
  senders: string[],
  hoursBack = 48,
  refreshToken = process.env.GMAIL_REFRESH_TOKEN!,
): Promise<GmailMessage[]> {
  const auth = createAuth(refreshToken)
  const gmail = google.gmail({ version: 'v1', auth })

  const afterSeconds = Math.floor((Date.now() - hoursBack * 3600 * 1000) / 1000)
  const fromClause = senders.length === 1
    ? `from:${senders[0]}`
    : `from:(${senders.join(' OR ')})`
  const query = `${fromClause} after:${afterSeconds}`

  const list = await gmail.users.messages.list({
    userId: 'me',
    q: query,
    maxResults: 50,
  })

  if (!list.data.messages?.length) return []

  const messages = await Promise.all(
    list.data.messages.map(async ({ id }) => {
      const msg = await gmail.users.messages.get({ userId: 'me', id: id!, format: 'full' })
      const headers = msg.data.payload?.headers as any
      return {
        id: id!,
        subject: getHeader(headers, 'Subject'),
        sender: getHeader(headers, 'From'),
        body: extractBody(msg.data.payload),
      }
    })
  )

  return messages
}

/** @deprecated Use getBankEmails instead */
export const getBCIEmails = (hoursBack?: number) =>
  getBankEmails(['contacto@bci.cl'], hoursBack)
