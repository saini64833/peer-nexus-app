import { useEffect, useRef } from "react";

/**
 * useChatScroll
 * Automatically scrolls a container to the bottom whenever `deps` change.
 * Returns a ref to attach to the scrollable container.
 */
export function useChatScroll(deps = []) {
  const ref = useRef(null);

  useEffect(() => {
    if (ref.current) {
      ref.current.scrollTop = ref.current.scrollHeight;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return ref;
}

export default useChatScroll;
