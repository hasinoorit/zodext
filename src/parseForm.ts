import { z } from 'zod';

/**
 * Valid keys for dot notation: letters, numbers, _, $, and -
 */
const KEY_PATH_REGEX = /[^.[\]]+|\[(?:(-?\d+(?:\.\d+)?)|(["'])((?:(?!\2)[^\\]|\\.)*?)\2)\]|(?=(?:\.|\[\])(?:\.|\[\]|$))/g;

/**
 * Parses FormData into a structured object based on a Zod schema.
 * Handles dot notation (user.name), array notation (items[0]), and type coercion.
 */
export function parseForm<T extends z.ZodTypeAny>(schema: T, formData: FormData): z.infer<T> {
    const raw: any = {};

    for (const [key, value] of formData.entries()) {
        setNestedValue(raw, key, value);
    }

    return coerceValue(schema, raw);
}

function setNestedValue(obj: any, path: string, value: any) {
    const keys: string[] = [];
    let match;

    // Reset regex index
    KEY_PATH_REGEX.lastIndex = 0;

    while ((match = KEY_PATH_REGEX.exec(path)) !== null) {
        if (match[1]) {
            keys.push(match[1]); // array index
        } else if (match[3]) {
            keys.push(match[3]); // quoted key
        } else if (match[0]) {
            keys.push(match[0]); // simple key
        }
    }

    // Remove empty matches often caused by the regex at the end
    const cleanKeys = keys.filter(k => k !== '');

    let current = obj;
    for (let i = 0; i < cleanKeys.length; i++) {
        const key = cleanKeys[i];
        const isLast = i === cleanKeys.length - 1;
        const nextKey = cleanKeys[i + 1];

        // If we are at the last key, assign the value
        if (isLast) {
            // Handle multiple values for the same key (implied array)
            if (Object.prototype.hasOwnProperty.call(current, key)) {
                if (!Array.isArray(current[key])) {
                    current[key] = [current[key]];
                }
                current[key].push(value);
            } else {
                current[key] = value;
            }
        } else {
            // Determine if the next node should be an array or object
            // If next key is a number, it's likely an array
            const isNextArray = !isNaN(Number(nextKey));

            if (!current[key]) {
                current[key] = isNextArray ? [] : {};
            }

            // If we encountered a conflict (object vs array), we might need to adjust,
            // but for now assume the path implies structure.
            // One common issue: "items" = string, then "items[0]" = ...
            // We'll trust the path order or strictness.

            current = current[key];
        }
    }
}

function coerceValue(schema: z.ZodTypeAny, value: any): any {
    if (value === undefined) return undefined;

    // Use typeName from def or constructor name as fallback
    // @ts-ignore
    const typeName = schema.def?.typeName ?? schema.constructor.name;

    // Unwrap Zod wrapper types
    if (typeName === 'ZodOptional' || typeName === 'ZodNullable') {
        // @ts-ignore
        return coerceValue(schema.unwrap(), value);
    }
    if (typeName === 'ZodDefault') {
        // @ts-ignore
        return coerceValue(schema.def.innerType, value);
    }
    if (typeName === 'ZodEffects') {
        // @ts-ignore
        return coerceValue(schema.def.schema, value);
    }

    // Primitives
    if (typeName === 'ZodString') {
        return String(value);
    }
    if (typeName === 'ZodNumber') {
        if (value === '') return undefined;
        const n = Number(value);
        return isNaN(n) ? value : n;
    }
    if (typeName === 'ZodBoolean') {
        if (value === 'true' || value === 'on' || value === '1' || value === true) return true;
        if (value === 'false' || value === 'off' || value === '0' || value === false) return false;
        return Boolean(value);
    }
    if (typeName === 'ZodDate') {
        if (value instanceof Date) return value;
        const d = new Date(value);
        return isNaN(d.getTime()) ? value : d;
    }

    // Objects
    if (typeName === 'ZodObject') {
        if (typeof value !== 'object' || value === null) return value;

        // @ts-ignore
        const shape = schema.shape;
        const result: any = {};

        for (const key in shape) {
            if (key in value) {
                result[key] = coerceValue(shape[key], value[key]);
            }
        }

        for (const key in value) {
            if (!(key in shape)) {
                result[key] = value[key];
            }
        }

        return result;
    }

    // Arrays
    if (typeName === 'ZodArray') {
        if (!Array.isArray(value)) {
            // @ts-ignore
            return [coerceValue(schema.element, value)];
        }
        // @ts-ignore
        return value.map((v: any) => coerceValue(schema.element, v));
    }


    return value;
}
