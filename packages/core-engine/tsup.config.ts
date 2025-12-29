import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'engine/index': 'src/engine/EngineConfig.ts',
    'world/index': 'src/world/index.ts',
    'species/index': 'src/species/index.ts',
    'neural/index': 'src/neural/index.ts',
    'events/index': 'src/events/index.ts',
    'genetics/index': 'src/genetics/index.ts',
    'lineage/index': 'src/lineage/index.ts',
  },
  format: ['cjs', 'esm'],
  dts: true,
  clean: true,
  splitting: false,
  sourcemap: true,
  treeshake: true,
  minify: false,
  target: 'es2022',
});
