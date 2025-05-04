# Notion Parallel Processing with Rust

This directory contains a Rust-based implementation for parallel processing of Notion API requests. It provides a significant performance improvement over the TypeScript implementation by utilizing Rust's efficient concurrency model.

## Requirements

- Rust (stable, 1.60+)
- Node.js (18+)
- Cargo and npm

## Building

To build the Rust library, you need to have Rust installed. If you don't have Rust installed, you can install it using [rustup](https://rustup.rs/).

```bash
# Navigate to the Rust project directory
cd rust/notion-parallel

# Build the release version
cargo build --release
```

After building, the compiled library will be available at `target/release/notion_parallel.node` (or similar name depending on your platform).

## Integration with TypeScript

The Rust library is integrated with the TypeScript codebase using Node.js Native Addons. The integration is handled in the `src/rust-bindings.ts` file, which provides a wrapper around the Rust implementation with a fallback to the TypeScript implementation in case the Rust library is not available.

## Configuration

The Rust implementation uses the same configuration as the TypeScript implementation:

- `parallelLimit`: Maximum number of concurrent requests to the Notion API (default: 5)
- `enableCaching`: Whether to enable caching of Notion API responses (default: true)
- `notionApiKey`: Notion API key (required)

## Performance Improvements

The Rust implementation provides several performance improvements over the TypeScript implementation:

1. **Efficient parallelism**: Rust's async runtime (tokio) and efficient threading model allow for better utilization of system resources.
2. **Memory efficiency**: Rust's ownership model ensures that memory is used efficiently and cleaned up promptly.
3. **Zero-cost abstractions**: Rust's abstractions compile down to efficient machine code without runtime overhead.

## Fallback Mechanism

If the Rust library is not available, the system will automatically fall back to the TypeScript implementation. This ensures that the system continues to work even if there are issues with the Rust library.

## Development

To develop the Rust library, you can use the following commands:

```bash
# Build in debug mode
cargo build

# Run tests
cargo test

# Check for errors or warnings
cargo check
``` 