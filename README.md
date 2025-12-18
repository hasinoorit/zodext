# zodext

Utility functions for Zod schemas to help with form generation and state management.

## Installation

```bash
pnpm add zodext
```

## deepPick(schema, path)

Extracts a nested validator from a Zod schema using dot-notation paths. Handles arrays, objects, and optional/nullable wrappers correctly.

```ts
import { z } from 'zod';
import { deepPick } from 'zodext';

const schema = z.object({
  user: z.object({
    name: z.string().optional()
  })
});

const nameValidator = deepPick(schema, 'user.name');
// Returns ZodOptional<ZodString>
```

## initialValue(schema)

Generates a default initial value for a Zod schema. Useful for initializing form state.

```ts
import { z } from 'zod';
import { initialValue } from 'zodext';

const schema = z.object({
  name: z.string(),
  age: z.number().default(18),
  isActive: z.boolean().optional()
});

const defaults = initialValue(schema);
// {
//   name: "",
//   age: 18,
//   isActive: undefined
// }
```

## parseForm(schema, formData)

Parses `FormData` & `URLSearchParams` into a structured object using a Zod schema for type coercion. Supports dot notation (`user.name`) and array notation (`items[0]`).

```ts
import { z } from 'zod';
import { parseForm } from 'zodext';

const schema = z.object({
  name: z.string(),
  age: z.number(), // Coerces "30" -> 30
  isActive: z.boolean(), // Coerces "on"/"true" -> true
  tags: z.array(z.string())
});

const formData = new FormData();
formData.append('name', 'Alice');
formData.append('age', '30');
formData.append('isActive', 'on');
formData.append('tags', 'designer');
formData.append('tags', 'developer');

const result = parseForm(schema, formData);
// {
//   name: "Alice",
//   age: 30,
//   isActive: true,
//   tags: ["designer", "developer"]
// }
```

## License

MIT
