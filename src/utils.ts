export const isNumber = (val: any): val is number => {
  if (typeof val === 'number') return true;

  if (typeof val === 'string') {
    return !isNaN(+val);
  }

  return false;
};
