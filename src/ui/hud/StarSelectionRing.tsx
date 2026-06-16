export const StarSelectionRing = () => {
  return (
    <div
      id="selection-ring"
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
