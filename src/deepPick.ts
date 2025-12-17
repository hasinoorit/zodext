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
            // @ts-ignore - ZodPipe is not in the type definition but exists at runtime in Zod v4
            (z.ZodPipe && currentSchema instanceof z.ZodPipe)
        ) {
            // @ts-ignore
            if (z.ZodPipe && currentSchema instanceof z.ZodPipe) {
                // @ts-ignore
                currentSchema = currentSchema._def.in;
            } else {
                currentSchema = currentSchema.unwrap();
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
            currentSchema = currentSchema.element;
        } else {
            console.error(`❌ Unhandled schema type for key "${key}": ${currentSchema.constructor.name}`);
            return undefined;
        }
    }

    // Final unwrap: Only unwrap ZodPipe (transforms) to get the input schema.
    // We DO NOT unwrap Optional/Nullable here as per requirements.
    // @ts-ignore
    while (z.ZodPipe && currentSchema instanceof z.ZodPipe) {
        // @ts-ignore
        currentSchema = currentSchema._def.in;
    }

    return currentSchema;
}
