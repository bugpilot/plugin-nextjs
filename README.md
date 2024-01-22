# Bugpilot for Next.js (App Router)

![NPM Version](https://img.shields.io/npm/v/@bugpilot/plugin-nextjs)

Bugpilot is a platform to catch production errors in your React applications. You can learn more and signup for free at [https://app.bugpilot.com](https://app.bugpilot.com).

This Bugpilot plugin for Next.js (App Router) automatically captures errors in your Next.js application and sends them to your Bugpilot workspace.

## Usage

The easiest way to get started is to use our CLI Wizard. It will automatically install the plugin and configure your Next.js application:

```bash
npx @bugpilot/wizard@latest install
```

## Key Features

Bugpilot is specifically designed for Next.js applications using App Router and provides the following features:

- Built-in error boundaries
- Automated error detection in client and server components
- Zero configuration or code changes
- Zero dependencies
- Automated source maps (when using Vercel)
- Near-zero runtime overhead
- (optional) Bug reporting widget

### Supported Error Types

This table shows which error types are supported by the Bugpilot plugin for Next.js (App Router), and for which error types an error page is rendered to the users

| Type                      | Catches Errors | Renders Error Page       |
|---------------------------|----------------|--------------------------|
| Server page               | Yes            | Yes                      |
| Server component          | Yes            | Yes                      |
| Server form               | Yes            | Yes                      |
| Server action             | Yes            | Yes                      |
| Inline server action      | Yes            | Yes                      |
| Client component          | Yes            | Yes                      |
| Browser exceptions        | Yes            | No                       |
| Errors in event handlers  | Yes            | No                       |
| Middleware                | Yes            | Not supported in Next.js |
| Layout                    | Yes            | Yes                      |
| Root Layout errors        | Yes            | Yes (app/global-error.tsx) |
| API Routes                | No             | No                       |

You can customize the error pages by updating the code in `app/error.tsx` and `app/global-error.tsx`.

## Customizations

### Customizing the Bug Reporting Widget

You can replace the default *Report Bug* label with your own React component:

```jsx
import { WidgetTrigger } from '@bugpilot/plugin-nextjs';

const MyComponent = () => {
  // Wrap a button/anchor/div/span with the WidgetTrigger component.
  // The component will automatically render the Bugpilot Bug Reporting widget when clicked.
  // (WidgetTrigger is a client component because it needs to use event handlers)

  return (
    <WidgetTrigger>
      <button>Report Bug</button>
    </WidgetTrigger>
  );
};

```

### Customizing the Error Pages

Coming soon

## Manual Installation

If you can't use our CLI Wizard or prefer to go through manual installation steps, please refer to this [Manual Installation Guide](https://github.com/bugpilot/wizard/wiki/Manual-Setup-(Next.js-App-Router)).

## Supported Versions

- Next.js 14.x
- React 18+

## Issues

Report any issues or feedback on [GitHub](https://github.com/bugpilot/plugin-nextjs/issues).

## License

MIT

> *Bugpilot npm packages are published with provenance so you can verify they are built from this repository.*
