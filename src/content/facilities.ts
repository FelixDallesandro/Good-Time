import type { Facility } from '../engine/types';

export const FACILITIES: Facility[] = [
  {
    id: 'cedar', name: 'Cedar Camp', custody: 'minimum', boxes: 5, startStanding: 2, difficulty: 'Easier', efv: true,
    front: 'Minimum custody. A fence, a ball field, a work crew that leaves at 6 a.m.',
    rules: '5 good-time boxes. Everyone starts at Standing 2. Politics cards are removed from the Yard deck. A major also transfers you to Harlan for the rest of the game. Extended family visits available.',
    watchedHarder: ['Native'],
    staffFrom: 'the farm town outside the fence'
  },
  {
    id: 'harlan', name: 'Harlan Correctional', custody: 'medium', boxes: 4, startStanding: 1, difficulty: 'Standard', efv: true,
    front: 'Medium custody. Four units, one yard, two cars that run it.',
    rules: '4 good-time boxes. The rules as written. Extended family visits available.',
    watchedHarder: ['Black', 'Native'],
    staffFrom: 'the valley towns'
  },
  {
    id: 'granite', name: 'Granite Close', custody: 'close', boxes: 3, startStanding: 1, difficulty: 'Hard', efv: false,
    front: 'Close custody. Cameras on every tier. Movement in lines.',
    rules: '3 good-time boxes. A major also adds 1 month to your sentence (up to the 3-month ceiling). +1 gray die on every Eyes roll. Politics cards are never discarded. Everyone starts with a debt string to their car. No extended family visits.',
    watchedHarder: ['Black', 'Latino', 'Native'],
    staffFrom: 'the timber county around it'
  }
];
