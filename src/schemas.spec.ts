import { describe, expect, it } from 'vitest';
import {
  CollectionFieldCreateSchema,
  CollectionFieldUpdateSchema,
} from './schemas.js';

describe('FieldConstraintsSchema', () => {
  it('accepts multi-currency constraints for create field inputs', () => {
    const result = CollectionFieldCreateSchema.parse({
      collectionId: '550e8400-e29b-41d4-a716-446655440000',
      key: 'price',
      label: 'Price',
      type: 'CURRENCY',
      constraints: {
        currencies: ['USD', 'EUR', 'COP'],
      },
    });

    expect(result.constraints).toEqual({
      currencies: ['USD', 'EUR', 'COP'],
    });
  });

  it('accepts multi-currency constraints for update field inputs', () => {
    const result = CollectionFieldUpdateSchema.parse({
      collectionId: '550e8400-e29b-41d4-a716-446655440000',
      fieldId: '550e8400-e29b-41d4-a716-446655440001',
      constraints: {
        currencies: ['USD', 'COP'],
      },
    });

    expect(result.constraints).toEqual({
      currencies: ['USD', 'COP'],
    });
  });

  it('rejects invalid currency codes', () => {
    expect(() =>
      CollectionFieldCreateSchema.parse({
        collectionId: '550e8400-e29b-41d4-a716-446655440000',
        key: 'price',
        label: 'Price',
        type: 'CURRENCY',
        constraints: {
          currencies: ['usd'],
        },
      }),
    ).toThrow();
  });
});
