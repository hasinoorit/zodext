/* eslint-disable @typescript-eslint/no-explicit-any */
import { z } from "zod";

export type Paths<T> = T extends object
    ? {
        [K in keyof T & (string | number)]: T[K] extends (infer U)[] // Handle Arrays
        ? U extends object
        // For arrays of objects, generate: "key" | "key[number]" | "key[number].nestedPath"
        ? `${K}` | `${K}[${number}]` | `${K}[${number}].${Paths<U>}`
        // For arrays of primitives, generate: "key" | "key[number]"
        : `${K}` | `${K}[${number}]`
        : T[K] extends object
        ? `${K}` | `${K}.${Paths<T[K]>}`
        : `${K}`;
    }[keyof T & (string | number)]
    : never;

export const deepPick = <T extends z.ZodType>(schema: T, path: Paths<z.infer<T>>) => {
    // Normalize path: "books[0].title" -> "books.0.title"
    const normalizedPath = (path as string)
        .replace(/\[(\d+)\]/g, '.$1')
        .replace(/^\./, '');

    const segments = normalizedPath.split('.');

    let currentSchema: z.ZodTypeAny = schema;

    for (let i = 0; i < segments.length; i++) {
        const key = segments[i];

        // Unwrap Optional/Nullable/Pipe unwrapping loop
        while (
            currentSchema instanceof z.ZodOptional ||
            currentSchema instanceof z.ZodNullable ||
            (typeof z.ZodPipe !== 'undefined' && currentSchema instanceof z.ZodPipe)
        ) {
            if (typeof z.ZodPipe !== 'undefined' && currentSchema instanceof z.ZodPipe) {
                // ZodPipe: unwrap to input schema
                // @ts-expect-error types
                currentSchema = currentSchema.def.in;
            } else if (currentSchema instanceof z.ZodOptional || currentSchema instanceof z.ZodNullable) {
                // Only call unwrap on ZodOptional/ZodNullable
                if (typeof (currentSchema as any).unwrap === 'function') {
                    currentSchema = (currentSchema as any).unwrap();
                } else {
                    // fallback: break if unwrap is not available
                    break;
                }
            } else {
                break;
            }
        }

        if (currentSchema instanceof z.ZodObject) {
            currentSchema = currentSchema.shape[key];
            if (!currentSchema) {
                console.error(`❌ Key "${key}" not found in ZodObject shape!`);
                return undefined;
            }
        } else if (currentSchema instanceof z.ZodArray) {
            if (!/^\d+$/.test(key)) {
                // console.warn(`⚠️ Expected numeric index for array, got "${key}".`);
            }
            // Zod v3: .element, Zod v4: .def.type
            if (typeof (currentSchema as any).element !== 'undefined') {
                currentSchema = (currentSchema as any).element;
            } else if (
                typeof (currentSchema as any).def !== 'undefined' &&
                (currentSchema as any).def &&
                typeof (currentSchema as any).def.type !== 'undefined'
            ) {
                currentSchema = (currentSchema as any).def.type;
            } else {
                console.error(`❌ Unable to get element type for ZodArray`);
                return undefined;
            }
        } else {
            console.error(`❌ Unhandled schema type for key "${key}": ${currentSchema.constructor.name}`);
            return undefined;
        }
    }

    // Final unwrap: Only unwrap ZodPipe (transforms) to get the input schema.
    // We DO NOT unwrap Optional/Nullable here as per requirements.
    while (z.ZodPipe && currentSchema instanceof z.ZodPipe) {
        // @ts-expect-error types
        currentSchema = currentSchema.def.in;
    }

    return currentSchema;
}
