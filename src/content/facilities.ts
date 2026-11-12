import type { Facility } from '../engine/types';

export const FACILITIES: Facility[] = [
  {
    id: 'cedar', name: 'Cedar Camp', custody: 'minimum', boxes: 5, startStanding: 2, crs: 58, difficulty: 'Easier', efv: true,
    front: 'Minimum custody. A fence, a ball field, a work crew that leaves at 6 a.m.',
    rules: 'Everyone starts at Standing 2. Politics cards are removed from the Yard deck. Lose 20 custody points in a review period and you can be demoted to Harlan. Extended family visits available.',
    watchedHarder: ['Native'],
    staffFrom: 'the farm town outside the fence'
  },
  {
    id: 'harlan', name: 'Harlan Correctional', custody: 'medium', boxes: 4, startStanding: 1, crs: 50, difficulty: 'Standard', efv: true,
    front: 'Medium custody. Four units, one yard, two cars that run it.',
    rules: 'The rules as written. Lose 20 custody points in a review period and you can be demoted to Granite. Extended family visits available.',
    watchedHarder: ['Black', 'Native'],
    staffFrom: 'the valley towns'
  },
  {
    id: 'granite', name: 'Granite Close', custody: 'close', boxes: 3, startStanding: 1, crs: 34, difficulty: 'Hard', efv: false,
    front: 'Close custody. Cameras on every tier. Movement in lines.',
    rules: '+1 gray die on every Eyes roll. Politics cards are never discarded. Everyone starts with a debt string to their car. No extended family visits.',
    watchedHarder: ['Black', 'Latino', 'Native'],
    staffFrom: 'the timber county around it'
  }
];
