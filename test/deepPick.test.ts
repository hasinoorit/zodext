import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { deepPick } from '../src/deepPick';

describe('deepPick', () => {
    it('should resolve extended schemas', () => {
        const base = z.object({ name: z.string() });
        const extended = base.extend({ age: z.number() });

        expect(deepPick(extended, 'name')).toBeInstanceOf(z.ZodString);
        expect(deepPick(extended, 'age')).toBeInstanceOf(z.ZodNumber);
    });

    it('should resolve picked schemas', () => {
        const original = z.object({ name: z.string(), age: z.number() });
        const picked = original.pick({ name: true });

        expect(deepPick(picked, 'name')).toBeInstanceOf(z.ZodString);
        // @ts-expect-error - 'age' should not exist on picked schema
        expect(deepPick(picked, 'age')).toBeUndefined();
    });

    it('should resolve transformed schemas', () => {
        const transformed = z.object({
            val: z.string().transform((val) => val.length)
        });

        // In Zod, the transformed schema is wrapped in ZodEffects. 
        // We generally want to access the input schema for form validation purposes.
        const validator = deepPick(transformed, 'val');
        // We expect ZodString because that's the input type
        expect(validator).toBeInstanceOf(z.ZodString);
    });

    it('should handle deeply nested complex schemas', () => {
        const complex = z.object({
            users: z.array(z.object({
                details: z.object({
                    isActive: z.boolean().nullable().optional()
                })
            }))
        });

        // Should return the Optional wrapper, not the underlying boolean
        expect(deepPick(complex, 'users[113].details.isActive')).toBeInstanceOf(z.ZodOptional);
    });

    it('should preserve nullish wrappers', () => {
        const schema = z.object({
            field: z.string().nullish()
        });
        expect(deepPick(schema, 'field')).toBeInstanceOf(z.ZodOptional);
    });

    it('should resolved array schemas', () => {
        const arraySchema = z.object({
            items: z.array(z.object({ id: z.string() }))
        });
        expect(deepPick(arraySchema, 'items')).toBeInstanceOf(z.ZodArray);
    });
});
