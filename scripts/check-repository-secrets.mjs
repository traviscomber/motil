import { execFileSync } from 'node:child_process';
import { readFileSync, statSync } from 'node:fs';
import { extname } from 'node:path';

const tracked = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' }).split('\0').filter(Boolean);
const textExtensions = new Set(['', '.env', '.example', '.js', '.jsx', '.mjs', '.cjs', '.ts', '.tsx', '.json', '.md', '.txt', '.yml', '.yaml', '.toml', '.sql', '.sh', '.ps1', '.html', '.css']);
const ignoredBasenames = new Set(['pnpm-lock.yaml']);
const placeholderPattern = /^(?:<.*>|\$\{.*\}|\$[A-Z0-9_]+|ci-placeholder|changeme|example|placeholder|your[-_ ]|test[-_ ]?only)/i;

const tokenRules = [
  { name: 'OpenAI-style secret', pattern: /\bsk-(?:proj-)?[A-Za-z0-9_-]{20,}\b/g },
  { name: 'Supabase secret key', pattern: /\bsb_secret_[A-Za-z0-9_-]{20,}\b/g },
  { name: 'Private key', pattern: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g },
];

const quotedCredential = /\b(?:password|passwd|pwd|contrase(?:n|ñ)a|secret|service_role_key|api_key|apikey|access_token|auth_token)\b\s*[:=]\s*(['"])([^'"]{6,})\1/gi;
const documentationCredential = /^\s*(?:[-*]\s*)?(?:\*\*|__)?(?:demo\s+)?(?:password|contrase(?:n|ñ)a)(?:\*\*|__)?\s*:\s*`?([^\s`]+)`?\s*$/i;
const findings = [];

for (const file of tracked) {
  if (ignoredBasenames.has(file.split('/').at(-1))) continue;
  if (file.startsWith('tests/')) continue;
  if (file === 'scripts/check-repository-secrets.mjs') continue;
  const extension = extname(file).toLowerCase();
  if (!textExtensions.has(extension) && !file.includes('.env')) continue;

  let stats;
  try { stats = statSync(file); } catch { continue; }
  if (!stats.isFile() || stats.size > 1_000_000) continue;

  let content;
  try { content = readFileSync(file, 'utf8'); } catch { continue; }

  const lines = content.split(/\r?\n/);
  lines.forEach((line, index) => {
    for (const rule of tokenRules) {
      rule.pattern.lastIndex = 0;
      if (rule.pattern.test(line)) findings.push(file + ':' + (index + 1) + ': ' + rule.name);
    }

    quotedCredential.lastIndex = 0;
    let match;
    while ((match = quotedCredential.exec(line)) !== null) {
      const candidate = String(match[2] || '');
      if (placeholderPattern.test(candidate)) continue;
      if (/process\.env|import\.meta\.env/i.test(line)) continue;
      findings.push(file + ':' + (index + 1) + ': hard-coded credential literal');
    }

    if (['.md', '.txt', '.sh'].includes(extension)) {
      const docMatch = line.match(documentationCredential);
      if (docMatch && !placeholderPattern.test(String(docMatch[1] || ''))) {
        findings.push(file + ':' + (index + 1) + ': plaintext credential documentation');
      }
    }
  });
}

if (findings.length > 0) {
  console.error('Potential repository secrets detected:');
  console.error([...new Set(findings)].join('\n'));
  console.error('Replace real credentials with environment variables or approved placeholders.');
  process.exitCode = 1;
} else {
  console.log('Secret guard checked ' + tracked.length + ' tracked files: no obvious plaintext credentials detected.');
}
