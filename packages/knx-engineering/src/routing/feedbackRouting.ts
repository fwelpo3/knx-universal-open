export type FunctionRoute = 'main' | 'feedback';

export interface FeedbackFunctionLike {
  isFeedback?: boolean;
  role?: 'command' | 'feedback' | 'unknown';
  enabled?: boolean;
}

export interface FeedbackConfigLike {
  middleGroup?: number;
  feedbackMiddleGroup?: number;
  functions: FeedbackFunctionLike[];
}

export function functionRoute(func: FeedbackFunctionLike, config: FeedbackConfigLike): FunctionRoute {
  const separateFeedback =
    config.feedbackMiddleGroup !== undefined &&
    config.feedbackMiddleGroup !== config.middleGroup;
  const isFeedback = func.role === 'feedback' || func.isFeedback === true;
  return separateFeedback && isFeedback ? 'feedback' : 'main';
}

export function hasFunctionsForRoute(config: FeedbackConfigLike, route: FunctionRoute): boolean {
  return config.functions.some(
    (func) => func.enabled !== false && functionRoute(func, config) === route,
  );
}
