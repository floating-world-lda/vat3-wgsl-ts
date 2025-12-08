export const fixedTimeAccumulator = (
  fps: number
): ((deltaTime: number) => number | null) => {
  const frameDuration = 1 / fps;
  let accumulator = 0;
  let animationTime = 0;

  return (deltaTime: number): number | null => {
    accumulator += deltaTime;
    if (accumulator >= frameDuration) {
      animationTime += frameDuration;
      accumulator -= frameDuration;
      return animationTime;
    }
    return null;
  };
};
