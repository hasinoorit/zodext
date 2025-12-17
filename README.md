# zod-utils

Utility functions for Zod schemas to help with form generation and state management.

## Installation

```bash
pnpm add zod-utils
```

## deepPick(schema, path)

Extracts a nested validator from a Zod schema using dot-notation paths. Handles arrays, objects, and optional/nullable wrappers correctly.

```ts
import { z } from 'zod';
import { deepPick } from 'zod-utils';

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
import { initialValue } from 'zod-utils';

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

## License

MIT
