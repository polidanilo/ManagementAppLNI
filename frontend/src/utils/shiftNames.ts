export const getShiftOrdinalName = (shiftNumber: number): string => {
  const ordinals = ['Primo', 'Secondo', 'Terzo', 'Quarto', 'Quinto', 'Sesto'];
  return ordinals[shiftNumber - 1] || `Turno ${shiftNumber}`;
};
