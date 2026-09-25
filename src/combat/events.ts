/**
 * Structured CombatEvent log — sim truth for a future narrator.
 * Narrative tags are machine-readable hints, not prose.
 */

export type NarrativeTag =
  | 'attack_commit'
  | 'attack_miss'
  | 'attack_hit'
  | 'armor_deflect'
  | 'armor_stop'
  | 'armor_penetrate'
  | 'wound'
  | 'major_wound'
  | 'stagger'
  | 'displace'
  | 'function_drop'
  | 'morale_shock'
  | 'flee'
  | 'rally'
  | 'incapacitated'
  | 'death'
  | 'duel_end'
  | 'tick_meta';

export interface CombatEvent {
  tick: number;
  timeS: number;
  type: string;
  actorId?: string;
  targetId?: string;
  tags: NarrativeTag[];
  data: Record<string, unknown>;
}

export class EventLog {
  readonly events: CombatEvent[] = [];

  push(e: CombatEvent): void {
    this.events.push(e);
  }

  byTag(tag: NarrativeTag): CombatEvent[] {
    return this.events.filter((e) => e.tags.includes(tag));
  }

  summaryLines(limit = 40): string[] {
    return this.events
      .filter((e) => e.type !== 'physiology' && e.type !== 'ai_wait')
      .slice(-limit)
      .map((e) => {
        const t = e.timeS.toFixed(2).padStart(6, ' ');
        const who = e.actorId ?? '';
        const tgt = e.targetId ? ` → ${e.targetId}` : '';
        const detail = formatDetail(e);
        return `[${t}s] ${e.type}${who ? ` (${who}${tgt})` : ''}${detail ? ': ' + detail : ''}`;
      });
  }
}

function formatDetail(e: CombatEvent): string {
  const d = e.data;
  switch (e.type) {
    case 'attack':
      return `${d.mode} @ ${d.partId} margin=${d.margin} band=${d.marginBand} pen=${d.penBand}`;
    case 'miss':
      return `${d.mode} margin=${d.margin}`;
    case 'wound':
      return `${d.partId} energy=${Number(d.energy).toFixed(1)} tissues=${JSON.stringify(d.tissuesHit)}`;
    case 'displace':
      return `${d.fromSlot}→${d.toSlot} impulse=${Number(d.impulse).toFixed(2)}`;
    case 'morale':
      return `morale=${d.morale} shock=${d.shock} band=${d.band}`;
    case 'end':
      return `winner=${d.winner} reason=${d.reason}`;
    default:
      return Object.keys(d).length ? JSON.stringify(d) : '';
  }
}
