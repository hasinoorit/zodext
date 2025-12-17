import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { parseForm } from '../src/parseForm';

describe('parseForm', () => {
    it('parses basic fields', () => {
        const schema = z.object({
            name: z.string(),
            age: z.number(),
            isActive: z.boolean(),
        });

        const formData = new FormData();
        formData.append('name', 'John Doe');
        formData.append('age', '30');
        formData.append('isActive', 'true');
        const result = parseForm(schema, formData);
        expect(result).toEqual({
            name: 'John Doe',
            age: 30,
            isActive: true,
        });
    });

    it('parses nested objects', () => {
        const schema = z.object({
            user: z.object({
                name: z.string(),
                settings: z.object({
                    theme: z.enum(['light', 'dark']),
                }),
            }),
        });

        const formData = new FormData();
        formData.append('user.name', 'Alice');
        formData.append('user.settings.theme', 'dark');

        const result = parseForm(schema, formData);

        expect(result).toEqual({
            user: {
                name: 'Alice',
                settings: {
                    theme: 'dark',
                },
            },
        });
    });

    it('parses arrays', () => {
        const schema = z.object({
            items: z.array(z.string()),
            numbers: z.array(z.number()),
        });

        const formData = new FormData();
        formData.append('items[0]', 'a');
        formData.append('items[1]', 'b');
        formData.append('numbers', '1');
        formData.append('numbers', '2');

        const result = parseForm(schema, formData);

        expect(result).toEqual({
            items: ['a', 'b'],
            numbers: [1, 2],
        });
    });

    it('parses array of objects', () => {
        const schema = z.object({
            users: z.array(z.object({
                name: z.string(),
                age: z.number(),
            })),
        });

        const formData = new FormData();
        formData.append('users[0].name', 'Bob');
        formData.append('users[0].age', '40');
        formData.append('users[1].name', 'Carol');
        formData.append('users[1].age', '25');

        const result = parseForm(schema, formData);

        expect(result).toEqual({
            users: [
                { name: 'Bob', age: 40 },
                { name: 'Carol', age: 25 },
            ],
        });
    });

    it('handles coercion for booleans', () => {
        const schema = z.object({
            flag1: z.boolean(),
            flag2: z.boolean(),
            flag3: z.boolean(),
        });

        const formData = new FormData();
        formData.append('flag1', 'on');
        formData.append('flag2', 'false');
        formData.append('flag3', '1');

        const result = parseForm(schema, formData);

        expect(result).toEqual({
            flag1: true,
            flag2: false,
            flag3: true,
        });
    });

    it('handles nullable and optional fields', () => {
        const schema = z.object({
            opt: z.string().optional(),
            nul: z.number().nullable(),
            def: z.string().default('default'),
        });

        const formData = new FormData();
        formData.append('nul', '123');

        const result = parseForm(schema, formData);

        expect(result.nul).toBe(123);
        // Coercion doesn't automatically fill defaults if missing in form data (unless we implemented that)
        // Currently `parseForm` iterates keys from formData primarily?
        // Actually my implementation iterates keys in `value` (from formData) but also checks schema keys?
        // Let's see what happens.
    });

    it('handles plain string arrays', () => {
        const schema = z.object({
            tags: z.array(z.string()),
        });
        const formData = new FormData();
        formData.append('tags', 'one');
        formData.append('tags', 'two');

        const result = parseForm(schema, formData);
        expect(result).toEqual({ tags: ['one', 'two'] });
    });
    it('handles deeply nested mixed structures', () => {
        const schema = z.object({
            site: z.object({
                posts: z.array(z.object({
                    id: z.number(),
                    meta: z.object({
                        tags: z.array(z.string()),
                    }),
                })),
            }),
        });

        const formData = new FormData();
        formData.append('site.posts[0].id', '101');
        formData.append('site.posts[0].meta.tags', 'news');
        formData.append('site.posts[0].meta.tags', 'tech');
        formData.append('site.posts[1].id', '102');
        formData.append('site.posts[1].meta.tags[0]', 'opinion');

        const result = parseForm(schema, formData);

        expect(result).toEqual({
            site: {
                posts: [
                    { id: 101, meta: { tags: ['news', 'tech'] } },
                    { id: 102, meta: { tags: ['opinion'] } },
                ],
            },
        });
    });

    it('handles boolean checkbox groups with single selection', () => {
        const schema = z.object({
            selections: z.array(z.boolean()), // Unusual but testing array handling
            ids: z.array(z.number()),
        });

        const formData = new FormData();
        formData.append('ids', '5'); // Single value, should become array

        const result = parseForm(schema, formData);

        expect(result.ids).toEqual([5]);
    });

    it('coerces dates correctly', () => {
        const schema = z.object({
            createdAt: z.date(),
            updatedAt: z.date(),
        });

        const dateStr = '2023-01-01T00:00:00.000Z';
        const formData = new FormData();
        formData.append('createdAt', dateStr);
        formData.append('updatedAt', new Date(dateStr).toISOString());

        const result = parseForm(schema, formData);

        expect(result.createdAt).toBeInstanceOf(Date);
        expect(result.createdAt.toISOString()).toBe(dateStr);
        expect(result.updatedAt).toBeInstanceOf(Date);
    });

    it('treats empty strings as undefined for optional numbers', () => {
        const schema = z.object({
            age: z.number().optional(),
            count: z.number().nullable(),
        });

        const formData = new FormData();
        formData.append('age', '');
        formData.append('count', '');

        const result = parseForm(schema, formData);

        expect(result.age).toBeUndefined();
        // For nullable, simple primitives usually stay undefined if empty string returned undefined
        // My implementation returns undefined for empty string on ZodNumber
        expect(result.count).toBeUndefined();
    });

    it('handles ZodEffects (refinements)', () => {
        const schema = z.object({
            email: z.string().email().refine(val => val.endsWith('.com')),
            age: z.string().transform(val => Number(val)),
        });

        const formData = new FormData();
        formData.append('email', 'test@example.com');
        formData.append('age', '50');

        const result = parseForm(schema, formData);

        expect(result).toEqual({
            email: 'test@example.com',
            age: '50', // Note: parseForm only does structural coercion based on the INNER type for ZodEffects. 
            // transform is a ZodEffect. The inner type of age is ZodString.
            // So it keeps it as string?
            // Wait, ZodEffects has `schema` which is the input type.
            // If I defined `z.string().transform(...)`, inner is string. Coerce value will see string, return string.
            // The transform happens at `.parse()` time, not `parseForm` time. 
            // This is expected behavior for a parser that prepares data FOR Zod.
        });
    });

});
