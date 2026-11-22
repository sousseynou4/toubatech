import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, normalize } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Une constante exportée par un module « use client » devient, côté serveur, une simple
 * référence client : `.map()` y plante et l'indexation renvoie undefined. Les constantes
 * partagées doivent vivre dans un module neutre (src/lib/…).
 */
const SRC = join(__dirname, '../../src');
const files: string[] = [];
const walk = (d: string) => readdirSync(d).forEach((f) => { const p = join(d, f); if (statSync(p).isDirectory()) walk(p); else if (/\.tsx?$/.test(f)) files.push(p); });
walk(SRC);
const isClient = (s: string) => /^\s*['"]use client['"]/.test(s);
const resolve = (from: string, spec: string) => normalize(spec.startsWith('@/') ? join(SRC, spec.slice(2)) : join(dirname(from), spec));

describe('frontière client / serveur', () => {
  it('aucun fichier serveur n\'importe une constante d\'un module « use client »', () => {
    const exported = new Map<string, string[]>();
    for (const f of files) {
      const s = readFileSync(f, 'utf8');
      if (isClient(s)) exported.set(f.replace(/\.tsx?$/, ''), [...s.matchAll(/export const ([A-Z][A-Z0-9_]+)/g)].map((m) => m[1]!));
    }
    const offenders: string[] = [];
    for (const f of files) {
      const s = readFileSync(f, 'utf8');
      if (isClient(s)) continue;
      for (const [, names, spec] of s.matchAll(/import \{([^}]*)\} from '([^']+)'/g)) {
        if (!spec!.startsWith('@/') && !spec!.startsWith('.')) continue;
        const consts = exported.get(resolve(f, spec!));
        if (!consts) continue;
        const used = names!.split(',').map((n) => n.trim().split(/\s+as\s+/)[0]!).filter((n) => consts.includes(n));
        if (used.length) offenders.push(`${f.slice(SRC.length + 1)} ← ${spec} : ${used.join(', ')}`);
      }
    }
    expect(offenders).toEqual([]);
  });
});
