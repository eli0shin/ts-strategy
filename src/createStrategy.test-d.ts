import { test, expectTypeOf } from 'vitest';
import { createStrategy } from './createStrategy';

// ============================================
// VARIANT ID INFERENCE
// ============================================

test('infers variant ID from a single string variant', () => {
  const strategy = createStrategy({
    variant: 'a',
    toExecute: () => 'result',
  });

  expectTypeOf(strategy.variant).parameter(0).toEqualTypeOf<'a'>();
});

test('infers variant ID as union from an array variant', () => {
  const strategy = createStrategy({
    variant: ['a', 'b'] as const,
    toExecute: () => 'result',
  });

  expectTypeOf(strategy.variant).parameter(0).toEqualTypeOf<'a' | 'b'>();
});

test('infers variant ID as union across multiple config args', () => {
  const strategy = createStrategy(
    { variant: 'a', toExecute: () => 'result' },
    { variant: 'b', toExecute: () => 'result' }
  );

  expectTypeOf(strategy.variant).parameter(0).toEqualTypeOf<'a' | 'b'>();
});

test('infers variant ID from mixed string and array configs', () => {
  const strategy = createStrategy(
    { variant: 'a', toExecute: () => 'result' },
    { variant: ['b', 'c'] as const, toExecute: () => 'result' }
  );

  expectTypeOf(strategy.variant).parameter(0).toEqualTypeOf<'a' | 'b' | 'c'>();
});

// ============================================
// INVALID VARIANT ID
// ============================================

test('rejects an invalid variant ID at compile time', () => {
  const strategy = createStrategy({
    variant: 'a',
    toExecute: () => 'result',
  });

  strategy.variant('a'); // valid

  // @ts-expect-error 'not-a-variant' is not assignable to 'a'
  strategy.variant('not-a-variant');
});

// ============================================
// EXECUTE PARAMETER TYPES
// ============================================

test('execute parameters match toExecute parameters', () => {
  const strategy = createStrategy({
    variant: 'a',
    toExecute: (a: string, b: number) => `${a}${b}`,
  });

  expectTypeOf(strategy.variant('a').execute)
    .parameter(0)
    .toEqualTypeOf<string>();
  expectTypeOf(strategy.variant('a').execute)
    .parameter(1)
    .toEqualTypeOf<number>();
});

test('execute with no parameters when toExecute takes none', () => {
  const strategy = createStrategy({
    variant: 'a',
    toExecute: () => 'result',
  });

  expectTypeOf(strategy.variant('a').execute).parameters.toEqualTypeOf<[]>();
});

// ============================================
// EXECUTE RETURN TYPE
// ============================================

test('execute return type matches toExecute return type', () => {
  const strategy = createStrategy({
    variant: 'a',
    toExecute: (): number => 42,
  });

  expectTypeOf(strategy.variant('a').execute).returns.toEqualTypeOf<number>();
});

// ============================================
// CROSS-VARIANT FUNCTION COMPATIBILITY
// ============================================

test('incompatible toExecute signatures cause a type error', () => {
  createStrategy(
    { variant: 'a', toExecute: (a: string) => a },
    // @ts-expect-error incompatible toExecute parameter types: string vs number
    { variant: 'b', toExecute: (a: number) => a }
  );
});
