/**
 * Adaptador mínimo de lectura Drive. Mauricio puede sustituir su implementación
 * por _shared/google.ts conservando listChildren() y getFile().
 * No se expone la clave privada al frontend ni se almacena en la base de datos.
 */
import { escapeDriveQueryId } from './drive-plan.mjs';

export interface DriveItem {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime?: string;
  webViewLink?: string;
  parents?: string[];
}

export class DriveApiError extends Error {
  constructor(public status: number, message = 'No se pudo consultar Google Drive') {
    super(message);
  }
}

function base64url(input: Uint8Array | string): string {
  const bytes = typeof input === 'string' ? new TextEncoder().encode(input) : input;
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

async function serviceAccountToken(): Promise<string> {
  const email = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_EMAIL');
  const keyString = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY')?.replace(/\\n/g, '\n');
  if (!email || !keyString) throw new Error('Falta configurar la cuenta de servicio de Google.');

  const encoded = keyString.replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\s/g, '');
  const keyBytes = Uint8Array.from(atob(encoded), (char) => char.charCodeAt(0));
  const key = await crypto.subtle.importKey('pkcs8', keyBytes, {
    name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256',
  }, false, ['sign']);
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const payload = base64url(JSON.stringify({
    iss: email, scope: 'https://www.googleapis.com/auth/drive.readonly',
    aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3000,
  }));
  const unsigned = `${header}.${payload}`;
  const signature = base64url(new Uint8Array(await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(unsigned),
  )));
  const reply = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: `${unsigned}.${signature}`,
    }),
  });
  if (!reply.ok) throw new Error('No se pudo autenticar la cuenta de servicio en Google.');
  const json = await reply.json();
  if (typeof json.access_token !== 'string') throw new Error('Token de Google inválido.');
  return json.access_token;
}

export async function googleDriveClient() {
  // Token por ejecución; no se comparte entre usuarios ni se expone al navegador.
  const token = await serviceAccountToken();
  async function getJson(url: URL): Promise<any> {
    for (let attempt = 0; attempt < 3; attempt++) {
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) return res.json();
      if ([429, 500, 502, 503, 504].includes(res.status) && attempt < 2) {
        await new Promise((resolve) => setTimeout(resolve, 400 * 2 ** attempt));
        continue;
      }
      throw new DriveApiError(res.status);
    }
  }
  return {
    async listChildren(folderId: string): Promise<DriveItem[]> {
      const id = escapeDriveQueryId(folderId);
      const results: DriveItem[] = [];
      let nextPageToken: string | undefined;
      do {
        const url = new URL('https://www.googleapis.com/drive/v3/files');
        url.searchParams.set('q', `'${id}' in parents and trashed = false`);
        url.searchParams.set('fields', 'nextPageToken,files(id,name,mimeType,modifiedTime,webViewLink,parents)');
        url.searchParams.set('pageSize', '1000');
        url.searchParams.set('supportsAllDrives', 'true');
        url.searchParams.set('includeItemsFromAllDrives', 'true');
        if (nextPageToken) url.searchParams.set('pageToken', nextPageToken);
        const page = await getJson(url);
        results.push(...(page.files ?? []));
        nextPageToken = page.nextPageToken;
      } while (nextPageToken);
      return results;
    },
    async getFile(fileId: string): Promise<DriveItem> {
      const id = escapeDriveQueryId(fileId);
      const url = new URL(`https://www.googleapis.com/drive/v3/files/${id}`);
      url.searchParams.set('fields', 'id,name,mimeType,modifiedTime,parents');
      url.searchParams.set('supportsAllDrives', 'true');
      return getJson(url);
    },
  };
}
