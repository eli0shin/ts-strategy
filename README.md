# ts-strategy

Type-safe strategy pattern for TypeScript. Register named strategy variants and execute them with compile-time type safety.

## Install

```sh
npm install ts-strategy
```

Requires TypeScript 5+.

## Usage

```ts
import { createStrategy } from 'ts-strategy';

const pricing = createStrategy(
  { variant: 'flat', toExecute: (amount: number) => amount },
  { variant: 'percentage', toExecute: (amount: number) => amount * 0.1 }
);

pricing.variant('flat').execute(100); // 100
pricing.variant('percentage').execute(100); // 10
```

## API

### `createStrategy(...config)`

```ts
function createStrategy<VariantId extends string, StrategyFn>(
  ...config: { variant: VariantId | VariantId[]; toExecute: StrategyFn }[]
): {
  variant: (id: VariantId) => { execute: (...args) => ReturnType<StrategyFn> };
};
```

Each config object maps one or more variant IDs to a `toExecute` function. Returns a strategy object with a `.variant(id).execute(...args)` chain.

**Parameters**

- `config` — Rest arguments. Each is an object with:
  - `variant` — A string or array of strings identifying this variant.
  - `toExecute` — The function to run when this variant is selected.

**Returns** an object with:

- `.variant(id)` — Selects a variant by ID. Returns an object with `.execute()`.
- `.execute(...args)` — Calls the variant's `toExecute` function with the provided arguments and returns its result.

## Type safety

All `toExecute` functions must have compatible signatures. TypeScript infers a single shared function type from all config entries:

```ts
// This compiles — both functions take (name: string) and return string
const strategy = createStrategy(
  { variant: 'a', toExecute: (name: string) => `Hello ${name}` },
  { variant: 'b', toExecute: (name: string) => `Goodbye ${name}` }
);

// This does NOT compile — (string) => string and (number) => number are incompatible
const strategy = createStrategy(
  { variant: 'a', toExecute: (x: string) => x },
  { variant: 'b', toExecute: (x: number) => x } // Type error
);
```

Variant IDs are narrowed to string literals. Passing an unregistered ID to `.variant()` is a compile-time error:

```ts
const strategy = createStrategy(
  { variant: 'a', toExecute: () => 1 },
  { variant: 'b', toExecute: () => 2 }
);

strategy.variant('a'); // OK
strategy.variant('c'); // Type error: '"c"' is not assignable to '"a" | "b"'
```

## Array variants

Map multiple variant IDs to the same function:

```ts
const strategy = createStrategy(
  { variant: 'a', toExecute: () => 'solo' },
  { variant: ['b', 'c'], toExecute: () => 'shared' }
);

strategy.variant('b').execute(); // 'shared'
strategy.variant('c').execute(); // 'shared'
```

## Error handling

Errors are deferred to `.execute()`. Calling `.variant(id)` with an unregistered ID does not throw — the error surfaces when `.execute()` is called:

```ts
// At runtime (e.g. via type assertion or dynamic input):
strategy.variant('unknown' as any).execute();
// throws Error: "No function defined for variant unknown"
```

## Duplicate variant IDs

If the same variant ID appears in multiple config entries, the last one wins:

```ts
const strategy = createStrategy(
  { variant: 'a', toExecute: () => 'first' },
  { variant: 'a', toExecute: () => 'second' }
);

strategy.variant('a').execute(); // 'second'
```

## License

MIT
