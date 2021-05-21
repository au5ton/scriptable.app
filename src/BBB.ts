// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: orange; icon-glyph: server; share-sheet-inputs: plain-text;

import { somethingElse } from './CCC';
import * as DDD from './DDD';

function doThing() {
  return `i'm different just for the sake of being different`
}

somethingElse();
console.log('doThing?'+DDD.doThing(2));
console.log('other thing?'+DDD.doOtherThing('foo', 'bar'));
console.log('third thing'+doThing());
