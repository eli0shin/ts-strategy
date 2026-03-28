import { test, expectTypeOf } from 'vitest';
import { query, compileDatadogQuery, queryBuilder } from './index';
import type {
  ValidatePattern,
  ValidatePatternWithError,
  BaseQueryType,
  Query,
} from './index';

// ============================================
// VALID CASES - Should compile without errors
// ============================================

test('valid single query', () => {
  // Just verifying this compiles - no assertion needed
  query([{ name: 'John' }]);
});

test('valid query chain with AND', () => {
  query([{ name: 'John' }, 'AND', { age: 30 }]);
});

test('valid query chain with OR', () => {
  query([{ name: 'John' }, 'OR', { age: 30 }]);
});

test('valid longer query chain', () => {
  query([{ name: 'John' }, 'AND', { age: 30 }, 'OR', { status: true }]);
});

test('valid nested query', () => {
  query([[{ name: 'John' }, 'OR', { name: 'Jane' }], 'AND', { age: 30 }]);
});

test('valid deeply nested query', () => {
  query([
    { status: 'active' },
    'AND',
    [{ name: 'John' }, 'OR', [{ age: 30 }, 'AND', { role: 'admin' }]],
  ]);
});

test('valid complex nested structure', () => {
  query([
    [{ country: 'USA' }, 'OR', { country: 'Canada' }],
    'AND',
    [{ age: 25 }, 'OR', { experience: 5 }],
    'AND',
    { active: true },
  ]);
});

test('valid single nested query at root', () => {
  query([[{ name: 'John' }, 'AND', { age: 30 }]]);
});

test('valid query chain with AND NOT', () => {
  query([{ name: 'John' }, 'AND NOT', { banned: true }]);
});

test('valid query chain with OR NOT', () => {
  query([{ name: 'John' }, 'OR NOT', { suspended: true }]);
});

test('valid chain mixing all operators', () => {
  query([
    { name: 'John' },
    'AND',
    { active: true },
    'AND NOT',
    { banned: true },
    'OR',
    { admin: true },
    'OR NOT',
    { guest: true },
  ]);
});

test('valid nested query with NOT operators', () => {
  query([
    [{ country: 'USA' }, 'OR NOT', { banned: true }],
    'AND NOT',
    { suspended: true },
  ]);
});

// ============================================
// INVALID CASES - Should produce type errors
// ============================================

test('empty query should error', () => {
  // @ts-expect-error empty query is invalid
  query([]);
});

test('empty nested query should error', () => {
  // @ts-expect-error empty nested array is invalid
  query([[], 'AND', { age: 30 }]);
});

test('wrong operator should error', () => {
  // @ts-expect-error "NAND" is not a valid operator
  query([{ name: 'John' }, 'NAND', { age: 30 }]);
});

test('lowercase operator should error', () => {
  // @ts-expect-error "and" is not a valid operator (must be uppercase)
  query([{ name: 'John' }, 'and', { age: 30 }]);
});

test('sequential queries should error', () => {
  // @ts-expect-error two queries without operator
  query([{ name: 'John' }, { age: 30 }]);
});

test('sequential operators should error', () => {
  // @ts-expect-error two operators in a row
  query([{ name: 'John' }, 'AND', 'OR', { age: 30 }]);
});

test('ends with operator should error', () => {
  // @ts-expect-error cannot end with operator
  query([{ name: 'John' }, 'AND']);
});

test('starts with operator should error', () => {
  // @ts-expect-error cannot start with operator
  query(['AND', { name: 'John' }]);
});

// ============================================
// NESTED ERROR CASES - Should produce type errors
// ============================================

test('nested query ends with operator should error', () => {
  // @ts-expect-error nested query cannot end with operator
  query([[{ name: 'John' }, 'AND'], 'OR', { age: 30 }]);
});

test('nested query starts with operator should error', () => {
  // @ts-expect-error nested query cannot start with operator
  query([['AND', { name: 'John' }], 'OR', { age: 30 }]);
});

test('nested sequential queries should error', () => {
  // @ts-expect-error nested sequential queries without operator
  query([[{ name: 'John' }, { name: 'Jane' }], 'AND', { age: 30 }]);
});

test('deeply nested invalid query should error', () => {
  // @ts-expect-error invalid at depth 2 - ends with operator
  query([
    { status: 'active' },
    'AND',
    [{ name: 'John' }, 'OR', [{ age: 30 }, 'AND']],
  ]);
});

test('nested empty array should error', () => {
  // @ts-expect-error nested empty array is invalid
  query([{ name: 'John' }, 'AND', []]);
});

// ============================================
// TYPE VALIDATION TESTS
// ============================================

test('ValidatePattern returns input type for valid pattern', () => {
  type Result = ValidatePattern<
    readonly [{ name: string }, 'AND', { age: number }]
  >;
  expectTypeOf<Result>().toEqualTypeOf<
    readonly [{ name: string }, 'AND', { age: number }]
  >();
});

test('BaseQueryType accepts valid query objects', () => {
  const query = { name: 'John', age: 30, active: true } satisfies BaseQueryType;
  expectTypeOf(query).toExtend<BaseQueryType>();
});

test('BaseQueryType accepts arrays of primitives', () => {
  const query = {
    tags: ['admin', 'user'],
    ids: [1, 2, 3],
  } satisfies BaseQueryType;
  expectTypeOf(query).toExtend<BaseQueryType>();
});

test('Query type accepts BaseQueryType', () => {
  const query = { name: 'John' } satisfies Query;
  expectTypeOf(query).toExtend<Query>();
});

// ============================================
// ERROR MESSAGE CONTENT TESTS
// ============================================

test('empty query returns correct error message', () => {
  type Result = ValidatePatternWithError<readonly []>;
  expectTypeOf<Result>().toEqualTypeOf<'ERROR: Query cannot be empty. Expected: [Query] or [Query, Operator, Query, ...]'>();
});

test('starting with operator returns correct error message', () => {
  type Result = ValidatePatternWithError<readonly ['AND', { name: string }]>;
  expectTypeOf<Result>().toEqualTypeOf<'ERROR: Query cannot start with an Operator. It must start with a Query.'>();
});

test('ending with operator returns correct error message', () => {
  type Result = ValidatePatternWithError<readonly [{ name: string }, 'AND']>;
  expectTypeOf<Result>().toEqualTypeOf<'ERROR: Query cannot end with an Operator. Expected a Query after the Operator.'>();
});

test('invalid operator returns correct error message', () => {
  type Result = ValidatePatternWithError<
    readonly [{ name: string }, 'NAND', { age: number }]
  >;
  expectTypeOf<Result>().toEqualTypeOf<"ERROR: After a Query, expected an Operator ('AND' | 'OR' | 'AND NOT' | 'OR NOT') but found something else.">();
});

// ============================================
// COMPILE QUERY - VALID CASES
// ============================================

test('compileDatadogQuery valid single query', () => {
  compileDatadogQuery([{ name: 'John' }]);
});

test('compileDatadogQuery valid query chain with AND', () => {
  compileDatadogQuery([{ name: 'John' }, 'AND', { age: 30 }]);
});

test('compileDatadogQuery valid query chain with OR', () => {
  compileDatadogQuery([{ name: 'John' }, 'OR', { age: 30 }]);
});

test('compileDatadogQuery valid longer query chain', () => {
  compileDatadogQuery([
    { name: 'John' },
    'AND',
    { age: 30 },
    'OR',
    { status: true },
  ]);
});

test('compileDatadogQuery valid nested query', () => {
  compileDatadogQuery([
    [{ name: 'John' }, 'OR', { name: 'Jane' }],
    'AND',
    { age: 30 },
  ]);
});

test('compileDatadogQuery valid deeply nested query', () => {
  compileDatadogQuery([
    { status: 'active' },
    'AND',
    [{ name: 'John' }, 'OR', [{ age: 30 }, 'AND', { role: 'admin' }]],
  ]);
});

test('compileDatadogQuery valid complex nested structure', () => {
  compileDatadogQuery([
    [{ country: 'USA' }, 'OR', { country: 'Canada' }],
    'AND',
    [{ age: 25 }, 'OR', { experience: 5 }],
    'AND',
    { active: true },
  ]);
});

test('compileDatadogQuery valid single nested query at root', () => {
  compileDatadogQuery([[{ name: 'John' }, 'AND', { age: 30 }]]);
});

test('compileDatadogQuery valid query chain with AND NOT', () => {
  compileDatadogQuery([{ name: 'John' }, 'AND NOT', { banned: true }]);
});

test('compileDatadogQuery valid query chain with OR NOT', () => {
  compileDatadogQuery([{ name: 'John' }, 'OR NOT', { suspended: true }]);
});

test('compileDatadogQuery valid chain mixing all operators', () => {
  compileDatadogQuery([
    { name: 'John' },
    'AND',
    { active: true },
    'AND NOT',
    { banned: true },
    'OR',
    { admin: true },
    'OR NOT',
    { guest: true },
  ]);
});

test('compileDatadogQuery valid nested query with NOT operators', () => {
  compileDatadogQuery([
    [{ country: 'USA' }, 'OR NOT', { banned: true }],
    'AND NOT',
    { suspended: true },
  ]);
});

// ============================================
// COMPILE QUERY - INVALID CASES
// ============================================

test('compileDatadogQuery empty query should error', () => {
  // @ts-expect-error empty query is invalid
  compileDatadogQuery([]);
});

test('compileDatadogQuery empty nested query should error', () => {
  // @ts-expect-error empty nested array is invalid
  compileDatadogQuery([[], 'AND', { age: 30 }]);
});

test('compileDatadogQuery wrong operator should error', () => {
  // @ts-expect-error "NAND" is not a valid operator
  compileDatadogQuery([{ name: 'John' }, 'NAND', { age: 30 }]);
});

test('compileDatadogQuery lowercase operator should error', () => {
  // @ts-expect-error "and" is not a valid operator (must be uppercase)
  compileDatadogQuery([{ name: 'John' }, 'and', { age: 30 }]);
});

test('compileDatadogQuery sequential queries should error', () => {
  // @ts-expect-error two queries without operator
  compileDatadogQuery([{ name: 'John' }, { age: 30 }]);
});

test('compileDatadogQuery sequential operators should error', () => {
  // @ts-expect-error two operators in a row
  compileDatadogQuery([{ name: 'John' }, 'AND', 'OR', { age: 30 }]);
});

test('compileDatadogQuery ends with operator should error', () => {
  // @ts-expect-error cannot end with operator
  compileDatadogQuery([{ name: 'John' }, 'AND']);
});

test('compileDatadogQuery starts with operator should error', () => {
  // @ts-expect-error cannot start with operator
  compileDatadogQuery(['AND', { name: 'John' }]);
});

// ============================================
// COMPILE QUERY - NESTED ERROR CASES
// ============================================

test('compileDatadogQuery nested query ends with operator should error', () => {
  // @ts-expect-error nested query cannot end with operator
  compileDatadogQuery([[{ name: 'John' }, 'AND'], 'OR', { age: 30 }]);
});

test('compileDatadogQuery nested query starts with operator should error', () => {
  // @ts-expect-error nested query cannot start with operator
  compileDatadogQuery([['AND', { name: 'John' }], 'OR', { age: 30 }]);
});

test('compileDatadogQuery nested sequential queries should error', () => {
  // @ts-expect-error nested sequential queries without operator
  compileDatadogQuery([
    [{ name: 'John' }, { name: 'Jane' }],
    'AND',
    { age: 30 },
  ]);
});

test('compileDatadogQuery deeply nested invalid query should error', () => {
  // @ts-expect-error invalid at depth 2 - ends with operator
  compileDatadogQuery([
    { status: 'active' },
    'AND',
    [{ name: 'John' }, 'OR', [{ age: 30 }, 'AND']],
  ]);
});

test('compileDatadogQuery nested empty array should error', () => {
  // @ts-expect-error nested empty array is invalid
  compileDatadogQuery([{ name: 'John' }, 'AND', []]);
});

// ============================================
// COMPILE QUERY - ERROR MESSAGE CONTENT TESTS
// ============================================

test('compileDatadogQuery empty query returns correct error message', () => {
  type Result = Parameters<typeof compileDatadogQuery<readonly []>>[0];
  expectTypeOf<Result>().toEqualTypeOf<
    readonly [] &
      'ERROR: Query cannot be empty. Expected: [Query] or [Query, Operator, Query, ...]'
  >();
});

test('compileDatadogQuery starting with operator returns correct error message', () => {
  type Result = Parameters<
    typeof compileDatadogQuery<readonly ['AND', { name: string }]>
  >[0];
  expectTypeOf<Result>().toEqualTypeOf<
    readonly ['AND', { name: string }] &
      'ERROR: Query cannot start with an Operator. It must start with a Query.'
  >();
});

test('compileDatadogQuery ending with operator returns correct error message', () => {
  type Result = Parameters<
    typeof compileDatadogQuery<readonly [{ name: string }, 'AND']>
  >[0];
  expectTypeOf<Result>().toEqualTypeOf<
    readonly [{ name: string }, 'AND'] &
      'ERROR: Query cannot end with an Operator. Expected a Query after the Operator.'
  >();
});

test('compileDatadogQuery invalid operator returns correct error message', () => {
  type Result = Parameters<
    typeof compileDatadogQuery<
      readonly [{ name: string }, 'NAND', { age: number }]
    >
  >[0];
  expectTypeOf<Result>().toEqualTypeOf<
    readonly [{ name: string }, 'NAND', { age: number }] &
      "ERROR: After a Query, expected an Operator ('AND' | 'OR' | 'AND NOT' | 'OR NOT') but found something else."
  >();
});

// ============================================
// QUERY BUILDER - VALID CASES
// ============================================

test('queryBuilder accepts BaseQueryType', () => {
  queryBuilder({ name: 'John' });
});

test('queryBuilder accepts BaseQueryType with multiple fields', () => {
  queryBuilder({ name: 'John', age: 30, active: true });
});

test('queryBuilder accepts result of query()', () => {
  const q = query([{ name: 'John' }, 'AND', { age: 30 }]);
  queryBuilder(q);
});

test('queryBuilder accepts complex nested query from query()', () => {
  const q = query([
    { status: 'active' },
    'OR',
    [{ role: 'admin' }, 'AND', { verified: true }],
  ]);
  queryBuilder(q);
});

test('queryBuilder.and() accepts BaseQueryType', () => {
  queryBuilder({ name: 'John' }).and({ age: 30 });
});

test('queryBuilder.and() accepts result of query()', () => {
  const nested = query([{ b: 2 }, 'OR', { c: 3 }]);
  queryBuilder({ a: 1 }).and(nested);
});

test('queryBuilder.or() accepts BaseQueryType', () => {
  queryBuilder({ name: 'John' }).or({ name: 'Jane' });
});

test('queryBuilder.or() accepts result of query()', () => {
  const nested = query([{ b: 2 }, 'AND', { c: 3 }]);
  queryBuilder({ a: 1 }).or(nested);
});

test('queryBuilder.andNot() accepts BaseQueryType', () => {
  queryBuilder({ active: true }).andNot({ banned: true });
});

test('queryBuilder.andNot() accepts result of query()', () => {
  const nested = query([{ banned: true }, 'OR', { suspended: true }]);
  queryBuilder({ active: true }).andNot(nested);
});

test('queryBuilder.orNot() accepts BaseQueryType', () => {
  queryBuilder({ name: 'John' }).orNot({ guest: true });
});

test('queryBuilder.orNot() accepts result of query()', () => {
  const nested = query([{ guest: true }, 'AND', { anonymous: true }]);
  queryBuilder({ name: 'John' }).orNot(nested);
});

test('queryBuilder chains multiple methods with mixed types', () => {
  const nestedOr = query([{ role: 'admin' }, 'OR', { role: 'superuser' }]);
  const nestedAnd = query([{ level: 5 }, 'AND', { verified: true }]);

  queryBuilder({ active: true })
    .and(nestedOr)
    .or({ department: 'engineering' })
    .andNot(nestedAnd)
    .orNot({ banned: true });
});

test('queryBuilder starting with query() result chains correctly', () => {
  const initial = query([{ a: 1 }, 'OR', { b: 2 }]);
  const nested = query([{ c: 3 }, 'AND', { d: 4 }]);

  queryBuilder(initial).and({ e: 5 }).or(nested).andNot({ f: 6 });
});

// ============================================
// QUERY BUILDER - INVALID CASES
// ============================================

test('queryBuilder.and() rejects invalid operator string', () => {
  // @ts-expect-error string is not a valid query
  queryBuilder({ a: 1 }).and('AND');
});

test('queryBuilder.and() rejects number', () => {
  // @ts-expect-error number is not a valid query
  queryBuilder({ a: 1 }).and(42);
});

test('queryBuilder.and() rejects null', () => {
  // @ts-expect-error null is not a valid query
  queryBuilder({ a: 1 }).and(null);
});

test('queryBuilder.or() rejects invalid operator string', () => {
  // @ts-expect-error string is not a valid query
  queryBuilder({ a: 1 }).or('OR');
});

test('queryBuilder.andNot() rejects boolean', () => {
  // @ts-expect-error boolean is not a valid query
  queryBuilder({ a: 1 }).andNot(true);
});

test('queryBuilder.orNot() rejects undefined', () => {
  // @ts-expect-error undefined is not a valid query
  queryBuilder({ a: 1 }).orNot(undefined);
});

// ============================================
// QUERY BUILDER - INVALID QUERY CHAIN CASES
// These should error just like query() does
// ============================================

test('queryBuilder.and() rejects sequential queries without operator', () => {
  // @ts-expect-error two queries without operator - same as query([{a:1}, {b:2}])
  queryBuilder({ x: 1 }).and([{ a: 1 }, { b: 2 }]);
});

test('queryBuilder.or() rejects sequential queries without operator', () => {
  // @ts-expect-error two queries without operator
  queryBuilder({ x: 1 }).or([{ a: 1 }, { b: 2 }]);
});

test('queryBuilder.andNot() rejects sequential queries without operator', () => {
  // @ts-expect-error two queries without operator
  queryBuilder({ x: 1 }).andNot([{ a: 1 }, { b: 2 }]);
});

test('queryBuilder.orNot() rejects sequential queries without operator', () => {
  // @ts-expect-error two queries without operator
  queryBuilder({ x: 1 }).orNot([{ a: 1 }, { b: 2 }]);
});

test('queryBuilder.and() rejects empty array', () => {
  // @ts-expect-error empty array is invalid
  queryBuilder({ x: 1 }).and([]);
});

test('queryBuilder.and() rejects array ending with operator', () => {
  // @ts-expect-error cannot end with operator
  queryBuilder({ x: 1 }).and([{ a: 1 }, 'AND']);
});

test('queryBuilder.and() rejects array starting with operator', () => {
  // @ts-expect-error cannot start with operator
  queryBuilder({ x: 1 }).and(['AND', { a: 1 }]);
});

test('queryBuilder.and() rejects invalid operator in array', () => {
  // @ts-expect-error "NAND" is not a valid operator
  queryBuilder({ x: 1 }).and([{ a: 1 }, 'NAND', { b: 2 }]);
});

test('queryBuilder.and() rejects nested invalid query chain', () => {
  // @ts-expect-error nested query ends with operator
  queryBuilder({ x: 1 }).and([{ a: 1 }, 'OR', [{ b: 2 }, 'AND']]);
});

test('queryBuilder initial rejects invalid query chain', () => {
  // @ts-expect-error sequential queries without operator
  queryBuilder([{ a: 1 }, { b: 2 }]);
});

test('queryBuilder initial rejects empty array', () => {
  // @ts-expect-error empty array is invalid
  queryBuilder([]);
});

test('queryBuilder initial rejects array ending with operator', () => {
  // @ts-expect-error cannot end with operator
  queryBuilder([{ a: 1 }, 'AND']);
});

test('queryBuilder initial rejects array starting with operator', () => {
  // @ts-expect-error cannot start with operator
  queryBuilder(['AND', { a: 1 }]);
});

// ============================================
// QUERY BUILDER - RETURN TYPE VALIDATION
// ============================================

test('queryBuilder.build() returns correct type for single BaseQueryType', () => {
  const result = queryBuilder({ name: 'John' }).build();
  // Result should be a tuple with the wrapped query
  expectTypeOf(result).toMatchTypeOf<readonly [readonly [{ name: string }]]>();
});

test('queryBuilder.build() returns correct type for query chain', () => {
  const q = query([{ a: 1 }, 'AND', { b: 2 }]);
  const result = queryBuilder(q).build();
  // Result should preserve the query chain type
  expectTypeOf(result).toMatchTypeOf<
    readonly [readonly [{ a: number }, 'AND', { b: number }]]
  >();
});

test('queryBuilder with .and() returns correct type', () => {
  const result = queryBuilder({ a: 1 }).and({ b: 2 }).build();
  expectTypeOf(result).toMatchTypeOf<
    readonly [readonly [{ a: number }], 'AND', readonly [{ b: number }]]
  >();
});

test('queryBuilder output compiles with compileDatadogQuery', () => {
  const q = queryBuilder({ name: 'John' }).and({ age: 30 }).build();
  // This should compile without errors
  compileDatadogQuery(q);
});

test('queryBuilder with query() input compiles with compileDatadogQuery', () => {
  const initial = query([{ a: 1 }, 'OR', { b: 2 }]);
  const result = queryBuilder(initial).and({ c: 3 }).build();
  // This should compile without errors
  compileDatadogQuery(result);
});
