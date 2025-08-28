# Enhanced Library System

This directory contains the enhanced, consolidated library system following our Core Principles.

## 🎯 Core Principles Applied

- **ENHANCEMENT FIRST**: Enhanced existing icon and utility systems
- **AGGRESSIVE CONSOLIDATION**: Removed custom React abstractions
- **PREVENT BLOAT**: Cleaned up unused dependencies
- **DRY**: Single source of truth for all shared logic
- **CLEAN**: Clear separation of concerns with explicit dependencies
- **MODULAR**: Composable, testable, independent modules
- **ORGANIZED**: Predictable file structure with domain-driven design

## 📁 File Structure

```
src/lib/
├── index.ts          # Main exports and constants
├── icons.ts          # Enhanced icon system
├── types.ts          # Comprehensive type definitions
├── utils.ts          # Enhanced utility functions
└── README.md         # This documentation
```

## 🎨 Enhanced Icon System

### Basic Usage

```tsx
// Direct icon imports (recommended)
import { Play, Pause, Volume2 } from "@/lib/icons";

// Using the enhanced Icon component
import { Icon, LoadingIcon, StatusIcon } from "@/components/ui/icon";

// Examples
<Icon name="play" size="md" />
<Icon name="pause" size={24} />
<LoadingIcon size="lg" />
<StatusIcon status="success" />
```

### Icon Registry

```tsx
import { ICONS, getIcon } from "@/lib/icons";

// Type-safe icon access
const PlayIcon = getIcon("play");
const allIcons = Object.keys(ICONS); // Autocomplete available
```

## 🔧 Enhanced Utilities

### Styling Utilities

```tsx
import { cn, conditionalClass } from "@/lib/utils";

// Combine classes with conflict resolution
const className = cn("base-class", condition && "conditional-class");

// Conditional styling
const buttonClass = conditionalClass("btn", isActive, "btn-active");
```

### String Utilities

```tsx
import { truncateText, titleCase, kebabCase } from "@/lib/utils";

const short = truncateText("Long text here", 20);
const title = titleCase("hello world"); // "Hello World"
const slug = kebabCase("CamelCase"); // "camel-case"
```

### Number & Formatting

```tsx
import { formatNumber, formatFileSize, formatDuration } from "@/lib/utils";

const count = formatNumber(1500); // "1.5K"
const size = formatFileSize(1024 * 1024); // "1 MB"
const time = formatDuration(125); // "2:05"
```

### Blockchain Utilities

```tsx
import { truncateAddress, isValidAddress } from "@/lib/utils";

const short = truncateAddress("0x1234...5678"); // "0x1234...5678"
const valid = isValidAddress("0x..."); // boolean
```

### Array & Object Utilities

```tsx
import { uniqueBy, groupBy, deepClone } from "@/lib/utils";

const unique = uniqueBy(items, "id");
const grouped = groupBy(items, "category");
const cloned = deepClone(complexObject);
```

### Async Utilities

```tsx
import { delay, debounce, throttle } from "@/lib/utils";

await delay(1000); // Wait 1 second

const debouncedFn = debounce(expensiveFunction, 300);
const throttledFn = throttle(frequentFunction, 100);
```

## 📝 Enhanced Type System

### Core Types

```tsx
import type { 
  Address, 
  ButtonVariant, 
  ButtonSize,
  IconProps,
  ExportProgress,
  MediaFile,
  Project 
} from "@/lib/types";

// Usage
const address: Address = "0x1234567890123456789012345678901234567890";
const variant: ButtonVariant = "ghost";
```

### Utility Types

```tsx
import type { Optional, RequiredFields, ApiResponse } from "@/lib/types";

// Make some fields optional
type PartialProject = Optional<Project, "description" | "isPublic">;

// Make some fields required
type RequiredProject = RequiredFields<Project, "name" | "ownerId">;

// API responses
const response: ApiResponse<Project[]> = {
  success: true,
  data: projects
};
```

## 🏗️ Enhanced Components

### Icon Component

```tsx
import { Icon, LoadingIcon, StatusIcon, IconButton } from "@/components/ui/icon";

// Basic usage
<Icon name="play" size="md" />

// Loading state
<LoadingIcon size="lg" />

// Status indicators
<StatusIcon status="success" />
<StatusIcon status="warning" />

// Interactive icons
<IconButton 
  name="delete" 
  onClick={handleDelete}
  aria-label="Delete item"
/>
```

## 🚀 Constants & Configuration

```tsx
import { 
  APP_CONFIG, 
  API_ENDPOINTS, 
  STORAGE_KEYS,
  FEATURE_FLAGS,
  BREAKPOINTS 
} from "@/lib";

// App configuration
console.log(APP_CONFIG.name); // "SayWhat"

// API endpoints
fetch(API_ENDPOINTS.projects);

// Feature flags
if (FEATURE_FLAGS.enableAI) {
  // AI features
}

// Responsive design
const isMobile = window.innerWidth < BREAKPOINTS.md;
```

## 🎯 Migration Guide

### From Old System

```tsx
// OLD (removed)
import { useState } from "@/lib/hooks-provider";
import { Play } from "@/lib/icons-provider";

// NEW (enhanced)
import { useState } from "react";
import { Play } from "@/lib/icons";
// or
import { Icon } from "@/components/ui/icon";
<Icon name="play" />
```

### Benefits

1. **Better Performance**: Standard React imports, better tree-shaking
2. **Type Safety**: Comprehensive TypeScript coverage
3. **Developer Experience**: Autocomplete, better error messages
4. **Maintainability**: Clear dependencies, organized structure
5. **Consistency**: Single source of truth for all shared logic

## 🧪 Testing

The enhanced system is designed to be easily testable:

```tsx
import { getIcon, formatNumber, cn } from "@/lib";

// Test utilities
expect(formatNumber(1500)).toBe("1.5K");
expect(cn("a", "b")).toBe("a b");

// Test icon system
const PlayIcon = getIcon("play");
expect(PlayIcon).toBeDefined();
```

## 📈 Performance

- **Reduced Bundle Size**: Removed unnecessary abstractions
- **Better Tree Shaking**: Standard imports enable better optimization
- **Faster Compilation**: No complex module augmentation
- **Improved Runtime**: Direct React usage, no proxy layers
