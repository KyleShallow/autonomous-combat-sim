import type { SlotId } from '../impact/displacement.js';

export type SizeClass = 'cramped' | 'narrow' | 'open' | 'wide';

export interface BattlefieldNode {
  id: string;
  name: string;
  sizeClass: SizeClass;
  /** Footing quality 0–1. */
  footing: number;
  /** Elevation (m). */
  elevation: number;
  hazards: string[];
  capacity: number;
}

export interface BattlefieldEdge {
  id: string;
  from: string;
  to: string;
  /** Length in meters. */
  length: number;
  width: number;
  choke: boolean;
}

export interface Battlefield {
  nodes: Map<string, BattlefieldNode>;
  edges: BattlefieldEdge[];
}

/** Demo alley: two nodes linked by a narrow edge. */
export function createAlleyMap(): Battlefield {
  const nodes = new Map<string, BattlefieldNode>();
  nodes.set('alley_north', {
    id: 'alley_north',
    name: 'Alley North',
    sizeClass: 'narrow',
    footing: 0.85,
    elevation: 0,
    hazards: [],
    capacity: 4,
  });
  nodes.set('alley_south', {
    id: 'alley_south',
    name: 'Alley South',
    sizeClass: 'narrow',
    footing: 0.8,
    elevation: 0,
    hazards: ['refuse'],
    capacity: 4,
  });
  return {
    nodes,
    edges: [
      {
        id: 'alley_passage',
        from: 'alley_north',
        to: 'alley_south',
        length: 4,
        width: 1.5,
        choke: true,
      },
    ],
  };
}

export type Facing = 'N' | 'E' | 'S' | 'W';

export interface ActorPlacement {
  nodeId: string;
  slot: SlotId;
  facing: Facing;
}
