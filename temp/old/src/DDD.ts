export function doThing(x) {
  return x + 2;
}

export function doOtherThing(a,b) {
  if(a) {
    return `${a}${b}`;
  }
  else {
    return `${b}${a}`;
  }
}