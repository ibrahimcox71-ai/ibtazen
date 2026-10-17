(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

// jsdom only provides rAF when built with `pretendToBeVisual`; Motion's
// frameloop needs a frame source either way.
if (typeof globalThis.requestAnimationFrame !== "function") {
  let handle = 0;
  const frames = new Map<number, FrameRequestCallback>();
  globalThis.requestAnimationFrame = (callback: FrameRequestCallback) => {
    handle += 1;
    const id = handle;
    frames.set(id, callback);
    setTimeout(() => {
      const frame = frames.get(id);
      frames.delete(id);
      if (frame) frame(performance.now());
    }, 16);
    return id;
  };
  globalThis.cancelAnimationFrame = (id: number) => {
    frames.delete(id);
  };
}
