import { test, expect, describe } from 'vitest';
import { query, queryBuilder, compileDatadogQuery } from './index';

describe('query', () => {
  describe('single query', () => {
    test('returns input for single query object', () => {
      expect(query([{ name: 'John' }])).toEqual([{ name: 'John' }]);
    });

    test('handles query with multiple fields', () => {
      expect(query([{ name: 'John', age: 30, active: true }])).toEqual([
        { name: 'John', age: 30, active: true },
      ]);
    });

    test('handles query with array values', () => {
      expect(query([{ tags: ['admin', 'user'], ids: [1, 2, 3] }])).toEqual([
        { tags: ['admin', 'user'], ids: [1, 2, 3] },
      ]);
    });

    test('handles query with null value', () => {
      expect(query([{ status: null }])).toEqual([{ status: null }]);
    });
  });

  describe('query chain', () => {
    test('returns input for simple AND chain', () => {
      expect(query([{ name: 'John' }, 'AND', { age: 30 }])).toEqual([
        { name: 'John' },
        'AND',
        { age: 30 },
      ]);
    });

    test('returns input for simple OR chain', () => {
      expect(query([{ name: 'John' }, 'OR', { age: 30 }])).toEqual([
        { name: 'John' },
        'OR',
        { age: 30 },
      ]);
    });

    test('returns input for longer chain', () => {
      expect(
        query([{ name: 'John' }, 'AND', { age: 30 }, 'OR', { status: true }])
      ).toEqual([{ name: 'John' }, 'AND', { age: 30 }, 'OR', { status: true }]);
    });

    test('returns input for chain with mixed operators', () => {
      expect(
        query([{ a: 1 }, 'AND', { b: 2 }, 'OR', { c: 3 }, 'AND', { d: 4 }])
      ).toEqual([{ a: 1 }, 'AND', { b: 2 }, 'OR', { c: 3 }, 'AND', { d: 4 }]);
    });
  });

  describe('nested queries', () => {
    test('returns input for simple nested query', () => {
      expect(
        query([[{ name: 'John' }, 'OR', { name: 'Jane' }], 'AND', { age: 30 }])
      ).toEqual([
        [{ name: 'John' }, 'OR', { name: 'Jane' }],
        'AND',
        { age: 30 },
      ]);
    });

    test('returns input for deeply nested query', () => {
      expect(
        query([
          { status: 'active' },
          'AND',
          [{ name: 'John' }, 'OR', [{ age: 30 }, 'AND', { role: 'admin' }]],
        ])
      ).toEqual([
        { status: 'active' },
        'AND',
        [{ name: 'John' }, 'OR', [{ age: 30 }, 'AND', { role: 'admin' }]],
      ]);
    });

    test('returns input for complex nested structure', () => {
      expect(
        query([
          [{ country: 'USA' }, 'OR', { country: 'Canada' }],
          'AND',
          [{ age: 25 }, 'OR', { experience: 5 }],
          'AND',
          { active: true },
        ])
      ).toEqual([
        [{ country: 'USA' }, 'OR', { country: 'Canada' }],
        'AND',
        [{ age: 25 }, 'OR', { experience: 5 }],
        'AND',
        { active: true },
      ]);
    });

    test('returns input for single nested query at root', () => {
      expect(query([[{ name: 'John' }, 'AND', { age: 30 }]])).toEqual([
        [{ name: 'John' }, 'AND', { age: 30 }],
      ]);
    });

    test('handles mixed nested and flat queries', () => {
      expect(
        query([{ a: 1 }, 'AND', [{ b: 2 }, 'OR', { c: 3 }], 'OR', { d: 4 }])
      ).toEqual([{ a: 1 }, 'AND', [{ b: 2 }, 'OR', { c: 3 }], 'OR', { d: 4 }]);
    });
  });

  describe('AND NOT and OR NOT operators', () => {
    test('returns input for simple AND NOT chain', () => {
      expect(
        query([{ name: 'John' }, 'AND NOT', { status: 'banned' }])
      ).toEqual([{ name: 'John' }, 'AND NOT', { status: 'banned' }]);
    });

    test('returns input for simple OR NOT chain', () => {
      expect(query([{ name: 'John' }, 'OR NOT', { age: 30 }])).toEqual([
        { name: 'John' },
        'OR NOT',
        { age: 30 },
      ]);
    });

    test('returns input for chain with mixed NOT operators', () => {
      expect(
        query([
          { active: true },
          'AND NOT',
          { banned: true },
          'OR NOT',
          { suspended: true },
        ])
      ).toEqual([
        { active: true },
        'AND NOT',
        { banned: true },
        'OR NOT',
        { suspended: true },
      ]);
    });

    test('returns input for chain mixing all operator types', () => {
      expect(
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
        ])
      ).toEqual([
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

    test('returns input for nested queries with NOT operators', () => {
      expect(
        query([
          [{ country: 'USA' }, 'OR NOT', { banned: true }],
          'AND NOT',
          { suspended: true },
        ])
      ).toEqual([
        [{ country: 'USA' }, 'OR NOT', { banned: true }],
        'AND NOT',
        { suspended: true },
      ]);
    });
  });

  describe('queryBuilder builder', () => {
    test('builds single query (wrapped in array)', () => {
      expect(queryBuilder({ name: 'John' }).build()).toEqual([
        [{ name: 'John' }],
      ]);
    });

    test('builds query with and()', () => {
      expect(queryBuilder({ name: 'John' }).and({ age: 30 }).build()).toEqual([
        [{ name: 'John' }],
        'AND',
        [{ age: 30 }],
      ]);
    });

    test('builds query with or()', () => {
      expect(
        queryBuilder({ name: 'John' }).or({ name: 'Jane' }).build()
      ).toEqual([[{ name: 'John' }], 'OR', [{ name: 'Jane' }]]);
    });

    test('builds query with andNot()', () => {
      expect(
        queryBuilder({ active: true }).andNot({ banned: true }).build()
      ).toEqual([[{ active: true }], 'AND NOT', [{ banned: true }]]);
    });

    test('builds query with orNot()', () => {
      expect(
        queryBuilder({ name: 'John' }).orNot({ suspended: true }).build()
      ).toEqual([[{ name: 'John' }], 'OR NOT', [{ suspended: true }]]);
    });

    test('chains multiple operators', () => {
      expect(
        queryBuilder({ a: 1 })
          .and({ b: 2 })
          .or({ c: 3 })
          .andNot({ d: 4 })
          .orNot({ e: 5 })
          .build()
      ).toEqual([
        [{ a: 1 }],
        'AND',
        [{ b: 2 }],
        'OR',
        [{ c: 3 }],
        'AND NOT',
        [{ d: 4 }],
        'OR NOT',
        [{ e: 5 }],
      ]);
    });
  });
});

describe('compileDatadogQuery', () => {
  describe('BaseQueryType (single object)', () => {
    test('compiles string value with quotes', () => {
      expect(compileDatadogQuery({ name: 'John' })).toBe('name:"John"');
    });

    test('compiles number value without quotes', () => {
      expect(compileDatadogQuery({ age: 30 })).toBe('age:30');
    });

    test('compiles boolean value without quotes', () => {
      expect(compileDatadogQuery({ active: true })).toBe('active:true');
    });

    test('compiles null value without quotes', () => {
      expect(compileDatadogQuery({ status: null })).toBe('status:null');
    });

    test('compiles array value with OR and parentheses', () => {
      expect(compileDatadogQuery({ status: ['active', 'pending'] })).toBe(
        'status:("active" OR "pending")'
      );
    });

    test('compiles array with mixed types', () => {
      expect(compileDatadogQuery({ values: [1, 'two', true] })).toBe(
        'values:(1 OR "two" OR true)'
      );
    });

    test('compiles multiple fields with explicit AND', () => {
      expect(compileDatadogQuery({ name: 'John', age: 30 })).toBe(
        'name:"John" AND age:30'
      );
    });

    test('compiles empty object as empty string', () => {
      expect(compileDatadogQuery({})).toBe('');
    });
  });

  describe('QueryChain (array/tuple)', () => {
    test('wraps single-element chain in parentheses', () => {
      expect(compileDatadogQuery([{ name: 'John' }])).toBe('(name:"John")');
    });

    test('compiles simple AND chain', () => {
      expect(compileDatadogQuery([{ name: 'John' }, 'AND', { age: 30 }])).toBe(
        '(name:"John" AND age:30)'
      );
    });

    test('compiles simple OR chain', () => {
      expect(
        compileDatadogQuery([{ name: 'John' }, 'OR', { name: 'Jane' }])
      ).toBe('(name:"John" OR name:"Jane")');
    });

    test('compiles AND NOT operator', () => {
      expect(compileDatadogQuery([{ a: 1 }, 'AND NOT', { b: 2 }])).toBe(
        '(a:1 AND NOT b:2)'
      );
    });

    test('compiles OR NOT operator', () => {
      expect(compileDatadogQuery([{ a: 1 }, 'OR NOT', { b: 2 }])).toBe(
        '(a:1 OR NOT b:2)'
      );
    });

    test('compiles longer chain with mixed operators', () => {
      expect(
        compileDatadogQuery([{ a: 1 }, 'AND', { b: 2 }, 'OR', { c: 3 }])
      ).toBe('(a:1 AND b:2 OR c:3)');
    });
  });

  describe('nested queries', () => {
    test('compiles nested QueryChain', () => {
      expect(
        compileDatadogQuery([{ a: 1 }, 'AND', [{ b: 2 }, 'OR', { c: 3 }]])
      ).toBe('(a:1 AND (b:2 OR c:3))');
    });

    test('compiles deeply nested QueryChain', () => {
      expect(
        compileDatadogQuery([
          { status: 'active' },
          'AND',
          [{ name: 'John' }, 'OR', [{ age: 30 }, 'AND', { role: 'admin' }]],
        ])
      ).toBe(
        '(status:"active" AND (name:"John" OR (age:30 AND role:"admin")))'
      );
    });

    test('compiles multiple nested groups', () => {
      expect(
        compileDatadogQuery([
          [{ country: 'USA' }, 'OR', { country: 'Canada' }],
          'AND',
          [{ age: 25 }, 'OR', { experience: 5 }],
        ])
      ).toBe(
        '((country:"USA" OR country:"Canada") AND (age:25 OR experience:5))'
      );
    });
  });

  describe('integration with query() and queryBuilder()', () => {
    test('compiles query() output', () => {
      const q = query([{ name: 'John' }, 'AND', { age: 30 }]);
      expect(compileDatadogQuery(q)).toBe('(name:"John" AND age:30)');
    });

    test('compiles queryBuilder().build() output (with wrapping)', () => {
      const q = queryBuilder({ name: 'John' }).and({ age: 30 }).build();
      expect(compileDatadogQuery(q)).toBe('((name:"John") AND (age:30))');
    });

    test('compiles complex queryBuilder chain', () => {
      const q = queryBuilder({ a: 1 })
        .and({ b: 2 })
        .andNot({ c: 3 })
        .or({ d: 4 })
        .build();
      expect(compileDatadogQuery(q)).toBe(
        '((a:1) AND (b:2) AND NOT (c:3) OR (d:4))'
      );
    });

    test('queryBuilder accepts result of query() with complex nested query', () => {
      const complexQuery = query([
        { status: 'active' },
        'OR',
        [{ role: 'admin' }, 'AND', { verified: true }],
      ]);

      const result = queryBuilder(complexQuery)
        .and({ department: 'engineering' })
        .or({ department: 'product' })
        .andNot({ banned: true })
        .build();

      const compiled = compileDatadogQuery(result);

      expect(compiled).toBe(
        '((status:"active" OR (role:"admin" AND verified:true)) AND (department:"engineering") OR (department:"product") AND NOT (banned:true))'
      );
    });
  });
});
