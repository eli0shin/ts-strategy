type StringOrStringArray<Value extends string> = Value | Value[];

// any is intentional here as this is a constraint type and not a concrete type. The actual types are defined by the Strategy type and enforced by the createStrategy function's implementation.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AbstractStrategyFn = (...args: any[]) => any;

type StrategyConfig<VariantId, StrategyFn> = {
  variant: VariantId;
  toExecute: StrategyFn;
}[];

type Strategy<VariantId, StrategyFn extends AbstractStrategyFn> = {
  variant: (variant: VariantId) => StrategyVariant<StrategyFn>;
};

type StrategyVariant<StrategyFn extends AbstractStrategyFn> = {
  execute: (...args: Parameters<StrategyFn>) => ReturnType<StrategyFn>;
};

/**
 * `createStrategy` creates a strategy with different `variant`s and their corresponding functions `toExecute`.
 *
 * The `toExecute` function's arguments and return
 * type must be compatible between all variants.
 * This means that if 1 variant accepts 3 args and
 * 1 only 2, all three args must be passed.
 * Similarly, if 1 returns keys `a` and `b`, and 1
 * only returns `a`, only `a` will be available in
 * the result's type.
 *
 * @example
 * // Define the strategy functions
 * const strategyA = (name: string) => `Result from strategy A ${name}`;
 * const strategyB = (name: string) => `Result from strategy B ${name}`;
 *
 * // Create the strategy with variants
 * // In this example, variants 'B', and 'C' will have the same behavior
 * // but variant 'A' will have a different behavior.
 * const myStrategy = createStrategy(
 *   { variant: 'A', toExecute: strategyA },
 *   { variant: ['B', 'C'], toExecute: strategyB }
 * );
 *
 * // Select and execute a strategy variant
 * const resultA = myStrategy.variant('A').execute('Bob');
 * console.log(resultA); // Output: 'Result from strategy A Bob'
 *
 * const resultB = myStrategy.variant('B').execute('Bob');
 * console.log(resultB); // Output: 'Result from strategy B Bob'
 *
 * const resultC = myStrategy.variant('C').execute('Bob');
 * console.log(resultC); // Output: 'Result from strategy B Bob'
 */
export function createStrategy<
  VariantId extends string,
  StrategyFn extends AbstractStrategyFn,
>(
  ...config: StrategyConfig<StringOrStringArray<VariantId>, StrategyFn>
): Strategy<VariantId, StrategyFn> {
  const variantsById = new Map<VariantId, StrategyFn>();

  config.forEach((variantConfig) => {
    if (typeof variantConfig.variant === 'string') {
      variantsById.set(variantConfig.variant, variantConfig.toExecute);
    } else {
      variantConfig.variant.forEach((variantId) => {
        variantsById.set(variantId, variantConfig.toExecute);
      });
    }
  });

  return {
    variant: function variant(variantId: VariantId) {
      return {
        execute: function execute(...args: Parameters<StrategyFn>) {
          const variantFn = variantsById.get(variantId);

          if (!variantFn) {
            throw new Error(`No function defined for variant ${variantId}`);
          }

          // The return type is defined by the Strategy type to be correct
          // eslint-disable-next-line @typescript-eslint/no-unsafe-return
          return variantFn(...args);
        },
      };
    },
  };
}
