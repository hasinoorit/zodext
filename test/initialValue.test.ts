import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { initialValue } from '../src/initialValue';

describe('initialValue', () => {
    it('should handle primitives', () => {
        expect(initialValue(z.string())).toBe("");
        expect(initialValue(z.number())).toBe(0);
        expect(initialValue(z.boolean())).toBe(false);
    });

    it('should handle defaults', () => {
        expect(initialValue(z.string().default("test"))).toBe("test");
        expect(initialValue(z.number().default(42))).toBe(42);
        expect(initialValue(z.boolean().default(true))).toBe(true);
    });

    it('should handle optionals and nullables', () => {
        expect(initialValue(z.string().optional())).toBeUndefined();
        expect(initialValue(z.string().nullable())).toBeNull();
    });

    it('should handle arrays', () => {
        expect(initialValue(z.array(z.string()))).toEqual([]);
        expect(initialValue(z.array(z.string()).default(["a"]))).toEqual(["a"]);
    });

    it('should handle objects', () => {
        const schema = z.object({
            name: z.string(),
            age: z.number().default(18),
            isActive: z.boolean().optional(),
        });

        expect(initialValue(schema)).toEqual({
            name: "",
            age: 18,
            isActive: undefined,
        });
    });

    it('should handle nested objects', () => {
        const schema = z.object({
            user: z.object({
                details: z.object({
                    bio: z.string()
                })
            })
        });

        expect(initialValue(schema)).toEqual({
            user: {
                details: {
                    bio: ""
                }
            }
        });
    });

    it('should handle enums', () => {
        const e = z.enum(["A", "B"]);
        expect(initialValue(e)).toBe("A");
    });

    it('should handle native enums', () => {
        enum Colors { Red = "Red", Blue = "Blue" }
        const e = z.nativeEnum(Colors);
        expect(initialValue(e)).toBe(Colors.Red);
    });

    it('should handle tuples', () => {
        const t = z.tuple([z.string(), z.number()]);
        expect(initialValue(t)).toEqual(["", 0]);
    });

    it('should handle records', () => {
        const r = z.record(z.string(), z.string());
        expect(initialValue(r)).toEqual({});
    });

    it('should handle unions (take first)', () => {
        const u = z.union([z.string(), z.number()]);
        expect(initialValue(u)).toBe("");

        const u2 = z.union([z.number(), z.string()]);
        expect(initialValue(u2)).toBe(0);
    });

    it('should handle transforms (use input)', () => {
        const t = z.string().transform(s => s.length);
        // Since we unwrap to input, we expect ""
        expect(initialValue(t)).toBe("");
    });
});
