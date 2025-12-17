import { z } from 'zod';

export type InitialValueOptions = {
    number?: number;
    string?: string;
    boolean?: boolean;
    array?: any[];
    record?: Record<string, any>;
}

export function initialValue<T extends z.ZodTypeAny>(schema: T, options: InitialValueOptions = {}): z.infer<T> {
    const { number = 0, string = "", boolean = false, array = [], record = {} } = options;
    const typeName = schema.constructor.name;

    // Handle ZodDefault
    if (typeName === 'ZodDefault') {
        // Safe way: parse undefined to get the default
        // @ts-ignore
        return schema.parse(undefined);
    }

    // Handle ZodOptional: return undefined
    if (typeName === 'ZodOptional') {
        return undefined as z.infer<T>;
    }

    // Handle ZodNullable: return null
    if (typeName === 'ZodNullable') {
        return null as z.infer<T>;
    }

    // Handle ZodEffects / ZodPipe (transforms): unwrap to input
    if (typeName === 'ZodPipe') {
        // @ts-ignore
        return initialValue(schema._def.in, options);
    }
    if (typeName === 'ZodEffects') {
        // @ts-ignore
        return initialValue(schema._def.schema, options);
    }

    // Primitives
    if (typeName === 'ZodString') {
        return string as z.infer<T>;
    }
    if (typeName === 'ZodNumber') {
        return number as z.infer<T>;
    }
    if (typeName === 'ZodBoolean') {
        return boolean as z.infer<T>;
    }
    if (typeName === 'ZodArray') {
        return array as z.infer<T>;
    }
    if (typeName === 'ZodEnum') {
        // @ts-ignore - ZodEnum v4 uses entries? Let's check schema.options first (v3), fallback to def
        // In debug, we saw 'entries' in _def. But schema.options should exist on the instance usually.
        // Let's safe check both.
        if ('options' in schema) {
            // @ts-ignore
            return schema.options[0];
        }
        // @ts-ignore
        return schema._def.values?.[0] ?? Object.keys(schema._def.entries ?? {})[0];
    }
    if (typeName === 'ZodNativeEnum') {
        // @ts-ignore
        const entries = schema._def.entries;
        // entries is object { key: val }
        const values = Object.values(entries);
        return values[0] as z.infer<T>;
    }

    // Objects
    if (typeName === 'ZodObject') {
        // @ts-ignore
        const shape = schema.shape;
        const result: Record<string, any> = {};
        for (const key in shape) {
            result[key] = initialValue(shape[key], options);
        }
        return result as z.infer<T>;
    }

    // Tuples
    if (typeName === 'ZodTuple') {
        // @ts-ignore
        const items = schema._def.items;
        // @ts-ignore
        return items.map((item: z.ZodTypeAny) => initialValue(item, options));
    }

    // Records
    if (typeName === 'ZodRecord') {
        return record as z.infer<T>;
    }

    // Unions - take the first option
    if (typeName === 'ZodUnion' || typeName === 'ZodDiscriminatedUnion') {
        // @ts-ignore
        return initialValue(schema.options[0], options);
    }

    // Fallback / Unknown

    return undefined as z.infer<T>;
}
