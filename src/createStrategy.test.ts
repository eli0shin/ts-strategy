import { test, expect, describe } from 'vitest';
import { createStrategy } from './createStrategy';

describe('createStrategy', () => {
  describe('single string variant', () => {
    test('executes the function registered for a variant', () => {
      const strategy = createStrategy({
        variant: 'a',
        toExecute: () => 'result-a',
      });

      expect(strategy.variant('a').execute()).toBe('result-a');
    });

    test('passes arguments through to the variant function', () => {
      const strategy = createStrategy({
        variant: 'a',
        toExecute: (x: number, y: number) => x + y,
      });

      expect(strategy.variant('a').execute(2, 3)).toBe(5);
    });

    test('selects the correct variant among multiple configs', () => {
      const strategy = createStrategy(
        { variant: 'a', toExecute: () => 1 },
        { variant: 'b', toExecute: () => 2 }
      );

      expect(strategy.variant('a').execute()).toBe(1);
      expect(strategy.variant('b').execute()).toBe(2);
    });
  });

  describe('array variant', () => {
    test('registers all variant IDs in an array to the same function', () => {
      const strategy = createStrategy({
        variant: ['a', 'b'],
        toExecute: () => 'shared',
      });

      expect(strategy.variant('a').execute()).toBe('shared');
      expect(strategy.variant('b').execute()).toBe('shared');
    });

    test('passes arguments through for array-registered variants', () => {
      const strategy = createStrategy({
        variant: ['x', 'y'],
        toExecute: (n: number) => n * 2,
      });

      expect(strategy.variant('x').execute(5)).toBe(10);
      expect(strategy.variant('y').execute(5)).toBe(10);
    });
  });

  describe('mixed string and array variants', () => {
    test('handles a mix of string and array variant configs', () => {
      const strategy = createStrategy(
        { variant: 'a', toExecute: () => 1 },
        { variant: ['b', 'c'], toExecute: () => 2 }
      );

      expect(strategy.variant('a').execute()).toBe(1);
      expect(strategy.variant('b').execute()).toBe(2);
      expect(strategy.variant('c').execute()).toBe(2);
    });
  });

  describe('unregistered variant', () => {
    test('.variant() does not throw for an unregistered variant ID', () => {
      const strategy = createStrategy({
        variant: 'a',
        toExecute: () => 'result',
      });

      expect(() =>
        (strategy as ReturnType<typeof createStrategy>).variant(
          'unknown' as never
        )
      ).not.toThrow();
    });

    test('.execute() throws for an unregistered variant ID', () => {
      const strategy = createStrategy({
        variant: 'a',
        toExecute: () => 'result',
      });

      expect(() =>
        (strategy as ReturnType<typeof createStrategy>)
          .variant('unknown' as never)
          .execute()
      ).toThrow();
    });

    test('error message includes the unregistered variant ID', () => {
      const strategy = createStrategy({
        variant: 'a',
        toExecute: () => 'result',
      });

      expect(() =>
        (strategy as ReturnType<typeof createStrategy>)
          .variant('nope' as never)
          .execute()
      ).toThrow('No function defined for variant nope');
    });
  });

  describe('edge cases', () => {
    test('duplicate variant ID uses the last registered function', () => {
      const strategy = createStrategy(
        { variant: 'a', toExecute: () => 'first' },
        { variant: 'a', toExecute: () => 'second' }
      );

      expect(strategy.variant('a').execute()).toBe('second');
    });

    test('duplicate variant ID across string and array uses the last registered', () => {
      const strategy = createStrategy(
        { variant: 'a', toExecute: () => 'first' },
        { variant: ['a', 'b'], toExecute: () => 'second' }
      );

      expect(strategy.variant('a').execute()).toBe('second');
      expect(strategy.variant('b').execute()).toBe('second');
    });

    test('empty variant array is a no-op', () => {
      const strategy = createStrategy({
        variant: [] as string[],
        toExecute: () => 'never',
      });

      expect(() =>
        (strategy as ReturnType<typeof createStrategy>)
          .variant('anything' as never)
          .execute()
      ).toThrow('No function defined for variant anything');
    });

    test('zero config args means all execute calls throw', () => {
      const strategy = createStrategy();

      expect(() =>
        (strategy as ReturnType<typeof createStrategy>)
          .variant('any' as never)
          .execute()
      ).toThrow('No function defined for variant any');
    });
  });
});
