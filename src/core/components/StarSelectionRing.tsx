import { useEffect, useRef } from 'react';

import { getState } from '@/store';

export const StarSelectionRing = () => {
  const divRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getState().setSelectionRingEl(divRef.current);

    return () => getState().setSelectionRingEl(null);
  }, []);

  return (
    <div
      ref={divRef}
      style={{
        position: 'fixed',
        width: 30,
        height: 30,
        border: '2px solid rgba(255, 255, 255, 0.8)',
        borderRadius: '50%',
        transform: 'translate(-50%, -50%)',
        pointerEvents: 'none',
        display: 'none',
        zIndex: 1,
      }}
    />
  );
};
