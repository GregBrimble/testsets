# Testsets

## Getting Started

```
npm install -D testsets
```

Add the following to your `package.json` in the root of your repository:

```json
{
  "workspaces": ["./testset/issues/*"]
}
```

## Commands

### `npx testset test`

Runs the test suite

### `npx testset issue 123-short-description`

Creates a new test fixture for a given issue.
