
import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { initialValue } from '../src/initialValue';

describe('initialValue with custom defaults', () => {
    it('should use provided string default', () => {
        const schema = z.string();
        const result = initialValue(schema, { string: "custom" });
        expect(result).toBe("custom");
    });

    it('should use provided number default', () => {
        const schema = z.number();
        const result = initialValue(schema, { number: 42 });
        expect(result).toBe(42);
    });

    it('should use provided boolean default', () => {
        const schema = z.boolean();
        const result = initialValue(schema, { boolean: true });
        expect(result).toBe(true);
    });

    it('should use provided array default', () => {
        const schema = z.array(z.string());
        const result = initialValue(schema, { array: ["init"] });
        expect(result).toEqual(["init"]);
    });

    it('should use provided record default', () => {
        const schema = z.record(z.string(), z.string());
        const result = initialValue(schema, { record: { key: "val" } });
        expect(result).toEqual({ key: "val" });
    });

    it('should apply defaults deeply to object properties', () => {
        const schema = z.object({
            name: z.string(),
            count: z.number(),
            isActive: z.boolean(),
        });
        const result = initialValue(schema, {
            string: "deep",
            number: 99,
            boolean: true
        });

        // Current implementation suspect: expects these to FAIL if options aren't passed down
        expect(result.name).toBe("deep");
        expect(result.count).toBe(99);
        expect(result.isActive).toBe(true);
    });
});
