export const FIELD = {
  /** Logical resolution */
  width: 1280,
  height: 720,
  /** Touchline margin around the playing area */
  margin: 40,
  /** Goal dimensions */
  goalWidth: 120,
  goalDepth: 24,
  /** Center circle radius */
  centerRadius: 90,
  /** Penalty box dimensions: width (along x from goal line) x height */
  penaltyBoxDepth: 200,
  penaltyBoxHeight: 280,
} as const;

export const PLAY_AREA = {
  minX: FIELD.margin,
  minY: FIELD.margin,
  maxX: FIELD.width - FIELD.margin,
  maxY: FIELD.height - FIELD.margin,
};

export const CENTER_X = FIELD.width / 2;
export const CENTER_Y = FIELD.height / 2;

export interface GoalRect {
  side: 'left' | 'right';
  /** mouth coordinates: open along x at the touchline */
  mouthMinY: number;
  mouthMaxY: number;
  /** The goal extends `goalDepth` beyond the touchline */
  outerX: number;
  innerX: number;
}

export const LEFT_GOAL: GoalRect = {
  side: 'left',
  mouthMinY: CENTER_Y - FIELD.goalWidth / 2,
  mouthMaxY: CENTER_Y + FIELD.goalWidth / 2,
  innerX: PLAY_AREA.minX,
  outerX: PLAY_AREA.minX - FIELD.goalDepth,
};

export const RIGHT_GOAL: GoalRect = {
  side: 'right',
  mouthMinY: CENTER_Y - FIELD.goalWidth / 2,
  mouthMaxY: CENTER_Y + FIELD.goalWidth / 2,
  innerX: PLAY_AREA.maxX,
  outerX: PLAY_AREA.maxX + FIELD.goalDepth,
};

export const LEFT_PENALTY = {
  minX: PLAY_AREA.minX,
  maxX: PLAY_AREA.minX + FIELD.penaltyBoxDepth,
  minY: CENTER_Y - FIELD.penaltyBoxHeight / 2,
  maxY: CENTER_Y + FIELD.penaltyBoxHeight / 2,
};

export const RIGHT_PENALTY = {
  minX: PLAY_AREA.maxX - FIELD.penaltyBoxDepth,
  maxX: PLAY_AREA.maxX,
  minY: CENTER_Y - FIELD.penaltyBoxHeight / 2,
  maxY: CENTER_Y + FIELD.penaltyBoxHeight / 2,
};
