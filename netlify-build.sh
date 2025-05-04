#!/bin/bash
set -e

# Rust 설치 확인 및 필요시 설치
if ! command -v cargo &> /dev/null; then
    echo "Installing Rust..."
    curl https://sh.rustup.rs -sSf | sh -s -- -y
    source $HOME/.cargo/env
else
    echo "Rust is already installed"
fi

# Rust 버전 확인
rustc --version
cargo --version

# Rust 라이브러리 빌드
echo "Building Rust library..."
cd rust/notion-parallel
cargo build --release || echo "Rust build failed, falling back to TypeScript"
cd ../..

# Node.js 패키지 빌드
echo "Building Node.js package..."
npm run build

echo "Build completed successfully!" 