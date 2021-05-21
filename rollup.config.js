import eslint from '@rollup/plugin-eslint';
import typescript from '@rollup/plugin-typescript';

/** @type {import('rollup').RollupOptions} */
const options = {
  input: [
    'src/AAA.ts',
    'src/BBB.ts',
  ],
  output: {
    format: 'esm',
    dir: 'dist',
  },
  plugins: [ typescript() ]
};
export default options;